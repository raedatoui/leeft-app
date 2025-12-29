import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

interface FileEmbedding {
    path: string;
    relativePath: string;
    content: string;
    embedding: number[];
    summary: string;
    keywords: string[];
    topics: string[];
    complexity: number;
    size: number;
    lastModified: Date;
}

interface EmbeddingCollection {
    files: FileEmbedding[];
    metadata: {
        generatedAt: Date;
        totalFiles: number;
        embeddingModel: string;
        projectRoot: string;
    };
}

class AnthropicEmbeddingGenerator {
    private anthropic: Anthropic;
    private projectRoot: string;
    private outputPath: string;

    constructor(projectRoot: string, outputPath: string) {
        this.projectRoot = projectRoot;
        this.outputPath = outputPath;
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    private getAllSourceFiles(dir: string, extensions: string[] = ['.ts', '.js']): string[] {
        const files: string[] = [];
        const items = readdirSync(dir);

        for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip node_modules and other common ignored directories
                if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'data'].includes(item)) {
                    continue;
                }
                files.push(...this.getAllSourceFiles(fullPath, extensions));
            } else if (stat.isFile()) {
                const ext = extname(item);
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    private async analyzeWithClaude(
        content: string,
        filePath: string
    ): Promise<{
        summary: string;
        keywords: string[];
        topics: string[];
        complexity: number;
    }> {
        try {
            const prompt = `Analyze this code file and provide:
1. A brief summary (1-2 sentences)
2. Key programming keywords/concepts used
3. Main topics/domains it covers
4. Complexity score (1-10, where 1 is simple and 10 is very complex)

File: ${relative(this.projectRoot, filePath)}

Code:
\`\`\`
${content.slice(0, 4000)} // Truncated for analysis
\`\`\`

Please respond in this JSON format:
{
  "summary": "Brief description of what this code does",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "topics": ["topic1", "topic2"],
  "complexity": 5
}`;

            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const text = response.content[0].type === 'text' ? response.content[0].text : '';

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    summary: analysis.summary || 'No summary available',
                    keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
                    topics: Array.isArray(analysis.topics) ? analysis.topics : [],
                    complexity: typeof analysis.complexity === 'number' ? analysis.complexity : 1,
                };
            }

            throw new Error('Could not parse Claude response');
        } catch (error) {
            logger.error(`Error analyzing ${filePath}:`);
            logger.error(error);
            return {
                summary: 'Analysis failed',
                keywords: [],
                topics: [],
                complexity: 1,
            };
        }
    }

    private textToEmbedding(text: string, analysis: any): number[] {
        // Create a simple numerical embedding based on text features and Claude analysis
        const words = text.toLowerCase().split(/\s+/);
        const lines = text.split('\n');

        // Basic text statistics
        const features = [
            words.length / 1000, // Normalized word count
            lines.length / 100, // Normalized line count
            analysis.complexity / 10, // Normalized complexity
            analysis.keywords.length / 10, // Number of keywords
            analysis.topics.length / 5, // Number of topics
        ];

        // Add keyword-based features
        const commonTerms = ['function', 'class', 'import', 'export', 'const', 'let', 'var', 'if', 'for', 'while'];
        commonTerms.forEach((term) => {
            const count = (text.match(new RegExp(term, 'gi')) || []).length;
            features.push(count / words.length); // Normalized frequency
        });

        // Pad or truncate to fixed size (100 dimensions)
        while (features.length < 100) {
            features.push(0);
        }

        return features.slice(0, 100);
    }

    private async processFile(filePath: string): Promise<FileEmbedding> {
        const content = readFileSync(filePath, 'utf-8');
        const stat = statSync(filePath);
        const relativePath = relative(this.projectRoot, filePath);

        logger.processing(`Processing: ${relativePath}`);

        // Analyze with Claude
        const analysis = await this.analyzeWithClaude(content, filePath);

        // Create embedding from text and analysis
        const embedding = this.textToEmbedding(content, analysis);

        return {
            path: filePath,
            relativePath,
            content,
            embedding,
            summary: analysis.summary,
            keywords: analysis.keywords,
            topics: analysis.topics,
            complexity: analysis.complexity,
            size: stat.size,
            lastModified: stat.mtime,
        };
    }

    async generateEmbeddings(): Promise<void> {
        logger.processing(`Starting Anthropic embedding generation for: ${this.projectRoot}`);

        // Get all source files
        const sourceFiles = this.getAllSourceFiles(this.projectRoot);
        logger.processing(`Found ${sourceFiles.length} source files`);

        // Process files in batches to avoid rate limits
        const batchSize = 5; // Conservative batch size for API limits
        const fileEmbeddings: FileEmbedding[] = [];

        for (let i = 0; i < sourceFiles.length; i += batchSize) {
            const batch = sourceFiles.slice(i, i + batchSize);
            logger.processing(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sourceFiles.length / batchSize)}`);

            for (const file of batch) {
                try {
                    const result = await this.processFile(file);
                    fileEmbeddings.push(result);

                    // Rate limiting delay between files
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (error) {
                    logger.error(`Error processing ${file}:`);
                    logger.error(error);
                }
            }

            // Longer delay between batches
            if (i + batchSize < sourceFiles.length) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        // Create embedding collection
        const collection: EmbeddingCollection = {
            files: fileEmbeddings,
            metadata: {
                generatedAt: new Date(),
                totalFiles: fileEmbeddings.length,
                embeddingModel: 'claude-3-haiku-20240307',
                projectRoot: this.projectRoot,
            },
        };

        // Ensure output directory exists
        mkdirSync(join(this.outputPath, '..'), { recursive: true });

        // Save embeddings to file
        writeFileSync(this.outputPath, JSON.stringify(collection, null, 2));
        logger.processed(`Anthropic embeddings saved to: ${this.outputPath}`);
        logger.summary(`Total files processed: ${fileEmbeddings.length}`);

        // Generate summary
        this.generateSummary(collection);
    }

    private generateSummary(collection: EmbeddingCollection): void {
        const summaryPath = this.outputPath.replace('.json', '-summary.json');

        // Collect all topics and keywords
        const allTopics: string[] = [];
        const allKeywords: string[] = [];

        collection.files.forEach((file) => {
            allTopics.push(...file.topics);
            allKeywords.push(...file.keywords);
        });

        // Count frequencies
        const topicCounts: Record<string, number> = {};
        const keywordCounts: Record<string, number> = {};

        allTopics.forEach((topic) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        allKeywords.forEach((keyword) => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });

        // Most complex files
        const complexFiles = collection.files
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 10)
            .map((f) => ({ file: f.relativePath, complexity: f.complexity, summary: f.summary }));

        const summary = {
            metadata: collection.metadata,
            statistics: {
                totalFiles: collection.files.length,
                averageComplexity: Math.round((collection.files.reduce((sum, f) => sum + f.complexity, 0) / collection.files.length) * 10) / 10,
                totalTopics: Object.keys(topicCounts).length,
                totalKeywords: Object.keys(keywordCounts).length,
            },
            topTopics: Object.entries(topicCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20)
                .map(([topic, count]) => ({ topic, count })),
            topKeywords: Object.entries(keywordCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20)
                .map(([keyword, count]) => ({ keyword, count })),
            mostComplexFiles: complexFiles,
        };

        writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        logger.summary(`Summary saved to: ${summaryPath}`);
    }

    // Search functionality using embeddings and semantic analysis
    async searchSimilar(
        query: string,
        embeddingsFile: string,
        topK: number = 5
    ): Promise<Array<{ file: string; similarity: number; summary: string }>> {
        const data = JSON.parse(readFileSync(embeddingsFile, 'utf-8')) as EmbeddingCollection;

        // Create query embedding using same technique
        const queryAnalysis = {
            complexity: 1,
            keywords: query.toLowerCase().split(/\s+/),
            topics: [],
        };
        const queryEmbedding = this.textToEmbedding(query, queryAnalysis);

        // Calculate cosine similarity
        const similarities = data.files.map((file) => {
            const similarity = this.cosineSimilarity(queryEmbedding, file.embedding);

            // Boost score for keyword/topic matches
            let boost = 0;
            const queryLower = query.toLowerCase();

            if (file.summary.toLowerCase().includes(queryLower)) boost += 0.3;
            if (file.keywords.some((k) => queryLower.includes(k.toLowerCase()))) boost += 0.2;
            if (file.topics.some((t) => queryLower.includes(t.toLowerCase()))) boost += 0.2;
            if (file.relativePath.toLowerCase().includes(queryLower)) boost += 0.1;

            return {
                file: file.relativePath,
                similarity: similarity + boost,
                summary: file.summary,
            };
        });

        // Sort by similarity and return top K
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
    }
}

export { AnthropicEmbeddingGenerator };
