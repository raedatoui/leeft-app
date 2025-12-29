import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { logger } from '../utils/logger';

interface JsonFileData {
    path: string;
    relativePath: string;
    content: string;
    features: JsonFeatures;
    hash: string;
    size: number;
    lastModified: Date;
}

interface JsonFeatures {
    keyCount: number;
    depth: number;
    arrayCount: number;
    objectCount: number;
    stringValues: string[];
    numericValues: number[];
    topLevelKeys: string[];
    dataType: 'array' | 'object' | 'primitive';
    estimatedComplexity: number;
}

interface JsonEmbeddingCollection {
    files: JsonFileData[];
    metadata: {
        generatedAt: Date;
        totalFiles: number;
        projectRoot: string;
        version: string;
    };
}

class JsonEmbeddingGenerator {
    private projectRoot: string;
    private outputPath: string;

    constructor(projectRoot: string, outputPath: string) {
        this.projectRoot = projectRoot;
        this.outputPath = outputPath;
    }

    private getAllJsonFiles(dir: string): string[] {
        const files: string[] = [];
        const items = readdirSync(dir);

        for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip common ignored directories but include data
                if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item)) {
                    continue;
                }
                files.push(...this.getAllJsonFiles(fullPath));
            } else if (stat.isFile()) {
                const ext = extname(item);
                if (ext === '.json') {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    private analyzeJsonStructure(
        data: any,
        depth: number = 0
    ): {
        keyCount: number;
        maxDepth: number;
        arrayCount: number;
        objectCount: number;
        stringValues: string[];
        numericValues: number[];
        topLevelKeys: string[];
    } {
        const analysis = {
            keyCount: 0,
            maxDepth: depth,
            arrayCount: 0,
            objectCount: 0,
            stringValues: [] as string[],
            numericValues: [] as number[],
            topLevelKeys: [] as string[],
        };

        if (Array.isArray(data)) {
            analysis.arrayCount++;
            data.forEach((item) => {
                const subAnalysis = this.analyzeJsonStructure(item, depth + 1);
                analysis.keyCount += subAnalysis.keyCount;
                analysis.maxDepth = Math.max(analysis.maxDepth, subAnalysis.maxDepth);
                analysis.arrayCount += subAnalysis.arrayCount;
                analysis.objectCount += subAnalysis.objectCount;
                analysis.stringValues.push(...subAnalysis.stringValues);
                analysis.numericValues.push(...subAnalysis.numericValues);
            });
        } else if (data && typeof data === 'object') {
            analysis.objectCount++;
            const keys = Object.keys(data);
            analysis.keyCount += keys.length;

            if (depth === 0) {
                analysis.topLevelKeys = keys;
            }

            keys.forEach((key) => {
                const value = data[key];
                if (typeof value === 'string') {
                    analysis.stringValues.push(value.slice(0, 100)); // Limit string length
                } else if (typeof value === 'number') {
                    analysis.numericValues.push(value);
                } else if (value && (typeof value === 'object' || Array.isArray(value))) {
                    const subAnalysis = this.analyzeJsonStructure(value, depth + 1);
                    analysis.keyCount += subAnalysis.keyCount;
                    analysis.maxDepth = Math.max(analysis.maxDepth, subAnalysis.maxDepth);
                    analysis.arrayCount += subAnalysis.arrayCount;
                    analysis.objectCount += subAnalysis.objectCount;
                    analysis.stringValues.push(...subAnalysis.stringValues);
                    analysis.numericValues.push(...subAnalysis.numericValues);
                }
            });
        }

        return analysis;
    }

    private extractJsonFeatures(content: string, _filePath: string): JsonFeatures {
        try {
            const data = JSON.parse(content);
            const analysis = this.analyzeJsonStructure(data);

            const dataType: 'array' | 'object' | 'primitive' = Array.isArray(data)
                ? 'array'
                : typeof data === 'object' && data !== null
                  ? 'object'
                  : 'primitive';

            // Simple complexity based on structure
            const estimatedComplexity = analysis.keyCount + analysis.maxDepth * 2 + analysis.arrayCount;

            return {
                keyCount: analysis.keyCount,
                depth: analysis.maxDepth,
                arrayCount: analysis.arrayCount,
                objectCount: analysis.objectCount,
                stringValues: analysis.stringValues.slice(0, 20), // Limit for storage
                numericValues: analysis.numericValues.slice(0, 20),
                topLevelKeys: analysis.topLevelKeys,
                dataType,
                estimatedComplexity,
            };
        } catch (_error) {
            // Invalid JSON
            return {
                keyCount: 0,
                depth: 0,
                arrayCount: 0,
                objectCount: 0,
                stringValues: [],
                numericValues: [],
                topLevelKeys: [],
                dataType: 'primitive',
                estimatedComplexity: 0,
            };
        }
    }

    private processFile(filePath: string): JsonFileData {
        const content = readFileSync(filePath, 'utf-8');
        const stat = statSync(filePath);
        const relativePath = relative(this.projectRoot, filePath);
        const hash = createHash('sha256').update(content).digest('hex');

        logger.processing(`Processing: ${relativePath}`);

        const features = this.extractJsonFeatures(content, filePath);

        return {
            path: filePath,
            relativePath,
            content,
            features,
            hash,
            size: stat.size,
            lastModified: stat.mtime,
        };
    }

    async generateEmbeddings(): Promise<void> {
        logger.processing(`Starting JSON embedding generation for: ${this.projectRoot}`);

        // Get all JSON files
        const jsonFiles = this.getAllJsonFiles(this.projectRoot);
        logger.processing(`Found ${jsonFiles.length} JSON files`);

        // Process all files
        const fileData: JsonFileData[] = [];

        for (const file of jsonFiles) {
            try {
                const data = this.processFile(file);
                fileData.push(data);
            } catch (error) {
                logger.warning(`Error processing ${file}:`);
                logger.warning(error);
            }
        }

        // Create embedding collection
        const collection: JsonEmbeddingCollection = {
            files: fileData,
            metadata: {
                generatedAt: new Date(),
                totalFiles: fileData.length,
                projectRoot: this.projectRoot,
                version: '1.0.0',
            },
        };

        // Ensure output directory exists
        mkdirSync(join(this.outputPath, '..'), { recursive: true });

        // Save embeddings to file
        writeFileSync(this.outputPath, JSON.stringify(collection, null, 2));
        logger.processed(`JSON embeddings saved to: ${this.outputPath}`);
        logger.summary(`Total files processed: ${fileData.length}`);

        // Generate summary
        this.generateSummary(collection);
    }

    private generateSummary(collection: JsonEmbeddingCollection): void {
        const summaryPath = this.outputPath.replace('.json', '-summary.json');

        // Calculate statistics
        const totalFiles = collection.files.length;
        const totalKeys = collection.files.reduce((sum, f) => sum + f.features.keyCount, 0);
        const avgDepth = Math.round((collection.files.reduce((sum, f) => sum + f.features.depth, 0) / totalFiles) * 10) / 10;

        // Data type distribution
        const dataTypes: Record<string, number> = {};
        collection.files.forEach((f) => {
            const type = f.features.dataType;
            dataTypes[type] = (dataTypes[type] || 0) + 1;
        });

        // Most complex files
        const complexFiles = collection.files
            .sort((a, b) => b.features.estimatedComplexity - a.features.estimatedComplexity)
            .slice(0, 10)
            .map((f) => ({ file: f.relativePath, complexity: f.features.estimatedComplexity, keys: f.features.keyCount }));

        // Common top-level keys
        const allTopKeys: string[] = [];
        collection.files.forEach((f) => {
            allTopKeys.push(...f.features.topLevelKeys);
        });
        const keyFrequency: Record<string, number> = {};
        allTopKeys.forEach((key) => {
            keyFrequency[key] = (keyFrequency[key] || 0) + 1;
        });

        const commonKeys = Object.entries(keyFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([key, count]) => ({ key, count }));

        const summary = {
            metadata: collection.metadata,
            statistics: {
                totalFiles,
                totalKeys,
                averageDepth: avgDepth,
                averageKeysPerFile: Math.round(totalKeys / totalFiles),
            },
            dataTypeDistribution: dataTypes,
            mostComplexFiles: complexFiles,
            commonTopLevelKeys: commonKeys,
        };

        writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        logger.summary(`JSON summary saved to: ${summaryPath}`);
    }

    // Search functionality for JSON files
    searchSimilar(query: string, embeddingsFile: string, topK: number = 5): Array<{ file: string; score: number; reason: string }> {
        const data = JSON.parse(readFileSync(embeddingsFile, 'utf-8')) as JsonEmbeddingCollection;
        const queryLower = query.toLowerCase();

        const results = data.files.map((file) => {
            let score = 0;
            const reasons: string[] = [];

            // Filename match
            if (file.relativePath.toLowerCase().includes(queryLower)) {
                score += 10;
                reasons.push('filename match');
            }

            // Content match (for string values in JSON)
            const contentMatches = file.features.stringValues.filter((val) => val.toLowerCase().includes(queryLower));
            score += contentMatches.length * 5;
            if (contentMatches.length > 0) {
                reasons.push(`content matches: ${contentMatches.length}`);
            }

            // Top-level key match
            const keyMatches = file.features.topLevelKeys.filter(
                (key) => key.toLowerCase().includes(queryLower) || queryLower.includes(key.toLowerCase())
            );
            score += keyMatches.length * 3;
            if (keyMatches.length > 0) {
                reasons.push(`key matches: ${keyMatches.join(', ')}`);
            }

            // Data type relevance
            if (query.includes('array') && file.features.dataType === 'array') {
                score += 2;
                reasons.push('array type');
            }
            if (query.includes('config') && file.relativePath.includes('config')) {
                score += 3;
                reasons.push('config file');
            }

            return {
                file: file.relativePath,
                score,
                reason: reasons.join(', ') || 'no specific match',
            };
        });

        return results
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}

export { JsonEmbeddingGenerator };
