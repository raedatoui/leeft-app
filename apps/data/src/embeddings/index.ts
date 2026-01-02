import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runCLI } from '../utils/cli';
import { logger } from '@leeft/utils';
import { AnthropicEmbeddingGenerator } from './anthropic-embeddings';
import { JsonEmbeddingGenerator } from './json-embeddings';

const projectRoot = process.cwd();
const anthropicPath = join(projectRoot, 'data', 'embeddings', 'anthropic-embeddings.json');
const jsonPath = join(projectRoot, 'data', 'embeddings', 'json-embeddings.json');

async function generate() {
    logger.processing('Generating both source code and JSON embeddings...\n');

    // Generate Anthropic embeddings for source code
    const anthropicGenerator = new AnthropicEmbeddingGenerator(projectRoot, anthropicPath);
    await anthropicGenerator.generateEmbeddings();

    logger.processing('\n---\n');

    // Generate local embeddings for JSON data
    const jsonGenerator = new JsonEmbeddingGenerator(projectRoot, jsonPath);
    await jsonGenerator.generateEmbeddings();

    logger.processed('All embeddings generated successfully!');
}

async function search() {
    const query = process.argv[2];
    const topK = parseInt(process.argv[3], 10) || 5;

    if (!query) {
        logger.error('Usage: bun src/embeddings/index.ts search "query text" [topK]');
        process.exit(1);
    }

    const results: Array<{ file: string; score: number; type: string; extra?: string }> = [];

    // Search source code embeddings
    if (existsSync(anthropicPath)) {
        const anthropicGenerator = new AnthropicEmbeddingGenerator(projectRoot, anthropicPath);
        const anthropicResults = await anthropicGenerator.searchSimilar(query, anthropicPath, topK);
        results.push(
            ...anthropicResults.map((r) => ({
                file: r.file,
                score: r.similarity,
                type: 'source',
                extra: r.summary,
            }))
        );
    }

    // Search JSON embeddings
    if (existsSync(jsonPath)) {
        const jsonGenerator = new JsonEmbeddingGenerator(projectRoot, jsonPath);
        const jsonResults = jsonGenerator.searchSimilar(query, jsonPath, topK);
        results.push(
            ...jsonResults.map((r) => ({
                file: r.file,
                score: r.score / 10, // Normalize to similarity scale
                type: 'json',
                extra: r.reason,
            }))
        );
    }

    // Combine and sort results
    const combinedResults = results.sort((a, b) => b.score - a.score).slice(0, topK);

    logger.info(`Top ${topK} similar files for query: "${query}"`);
    combinedResults.forEach((result, index) => {
        logger.info(`${index + 1}. ${result.file} [${result.type}] (score: ${result.score.toFixed(3)})`);
        if (result.extra) {
            logger.info(`   ${result.extra}`);
        }
    });
}

const commands = {
    generate,
    search,
};

runCLI({
    commands,
    usage: 'bun src/embeddings/index.ts <command> [args...]',
    examples: ['bun src/embeddings/index.ts generate', 'bun src/embeddings/index.ts search "workout data" 5'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});

export { AnthropicEmbeddingGenerator, JsonEmbeddingGenerator };
