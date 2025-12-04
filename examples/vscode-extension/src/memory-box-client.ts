/**
 * Memory Box Client for VS Code Extensions
 * 
 * This TypeScript module provides a clean interface for VS Code extensions
 * to communicate with the Memory Box Python bridge via stdin/stdout.
 * 
 * Usage:
 * ```typescript
 * import { MemoryBoxClient } from './memory-box-client';
 * 
 * const client = new MemoryBoxClient();
 * await client.start();
 * 
 * // Add a command
 * const id = await client.addCommand('docker ps', 'List containers');
 * 
 * // Search commands
 * const results = await client.searchCommands('doker', { fuzzy: true });
 * 
 * await client.stop();
 * ```
 */

import { ChildProcess, spawn } from 'child_process';

interface Command {
    id: string;
    command: string;
    description: string;
    tags: string[];
    os?: string;
    project_type?: string;
    context?: string;
    category?: string;
    created_at: string;
    last_used?: string;
    use_count: number;
}

interface BridgeRequest {
    method: string;
    params: Record<string, any>;
}

interface BridgeResponse {
    result: any;
    error: string | null;
}

export class MemoryBoxClient {
    private process: ChildProcess | null = null;
    private pendingRequests: Map<number, {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
    }> = new Map();
    private requestId = 0;
    private buffer = '';

    constructor(private pythonPath: string = 'python') { }

    /**
     * Start the Memory Box bridge process
     */
    async start(config?: {
        neo4jUri?: string;
        neo4jUser?: string;
        neo4jPassword?: string;
    }): Promise<void> {
        return new Promise((resolve, reject) => {
            // Build args
            const args = ['-m', 'memory_box.bridge'];
            if (config?.neo4jUri) {
                args.push('--neo4j-uri', config.neo4jUri);
            }
            if (config?.neo4jUser) {
                args.push('--neo4j-user', config.neo4jUser);
            }
            if (config?.neo4jPassword) {
                args.push('--neo4j-password', config.neo4jPassword);
            }

            this.process = spawn(this.pythonPath, args);

            this.process.stdout?.on('data', (data: Buffer) => {
                this.handleData(data);
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                console.error('[Memory Box Bridge Error]', data.toString());
            });

            this.process.on('error', (error: Error) => {
                reject(error);
            });

            this.process.on('exit', (code: number | null) => {
                console.log(`[Memory Box Bridge] Exited with code ${code}`);
                this.process = null;
            });

            // Test connection with ping
            this.ping()
                .then(() => resolve())
                .catch(reject);
        });
    }

    /**
     * Stop the Memory Box bridge process
     */
    async stop(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    /**
     * Send a request to the bridge
     */
    private async sendRequest(method: string, params: Record<string, any> = {}): Promise<any> {
        if (!this.process || !this.process.stdin) {
            throw new Error('Bridge process not started');
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            this.pendingRequests.set(id, { resolve, reject });

            const request: BridgeRequest = { method, params };
            const requestLine = JSON.stringify(request) + '\n';

            this.process!.stdin!.write(requestLine, (error) => {
                if (error) {
                    this.pendingRequests.delete(id);
                    reject(error);
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request timeout for method: ${method}`));
                }
            }, 30000);
        });
    }

    /**
     * Handle incoming data from the bridge
     */
    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        let newlineIndex: number;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.substring(0, newlineIndex).trim();
            this.buffer = this.buffer.substring(newlineIndex + 1);

            if (!line) continue;

            try {
                const response: BridgeResponse = JSON.parse(line);
                this.handleResponse(response);
            } catch (error) {
                console.error('[Memory Box] Failed to parse response:', line, error);
            }
        }
    }

    /**
     * Handle a bridge response
     */
    private handleResponse(response: BridgeResponse): void {
        // For simplicity, resolve the first pending request
        // In a real implementation, you'd use request IDs
        const firstRequest = this.pendingRequests.values().next().value;
        if (firstRequest) {
            this.pendingRequests.clear();

            if (response.error) {
                firstRequest.reject(new Error(response.error));
            } else {
                firstRequest.resolve(response.result);
            }
        }
    }

    /**
     * Test connection to the bridge
     */
    async ping(): Promise<string> {
        return this.sendRequest('ping');
    }

    /**
     * Add a command to Memory Box
     */
    async addCommand(
        command: string,
        description: string = '',
        options: {
            tags?: string[];
            os?: string;
            project_type?: string;
            context?: string;
            category?: string;
        } = {}
    ): Promise<string> {
        return this.sendRequest('add_command', {
            command,
            description,
            ...options,
        });
    }

    /**
     * Search for commands
     */
    async searchCommands(
        query: string = '',
        options: {
            fuzzy?: boolean;
            os?: string;
            project_type?: string;
            category?: string;
            tags?: string[];
            limit?: number;
        } = {}
    ): Promise<Command[]> {
        return this.sendRequest('search_commands', {
            query,
            ...options,
        });
    }

    /**
     * Get a specific command by ID
     */
    async getCommand(commandId: string): Promise<Command | null> {
        return this.sendRequest('get_command', {
            command_id: commandId,
        });
    }

    /**
     * List commands with optional filters
     */
    async listCommands(
        options: {
            os?: string;
            project_type?: string;
            category?: string;
            tags?: string[];
            limit?: number;
        } = {}
    ): Promise<Command[]> {
        return this.sendRequest('list_commands', options);
    }

    /**
     * Delete a command
     */
    async deleteCommand(commandId: string): Promise<boolean> {
        return this.sendRequest('delete_command', {
            command_id: commandId,
        });
    }

    /**
     * Get all tags
     */
    async getAllTags(): Promise<string[]> {
        return this.sendRequest('get_all_tags');
    }

    /**
     * Get all categories
     */
    async getAllCategories(): Promise<string[]> {
        return this.sendRequest('get_all_categories');
    }
}

/**
 * Example usage in a VS Code extension
 */
export async function exampleUsage() {
    const client = new MemoryBoxClient();

    try {
        // Start the bridge
        await client.start();
        console.log('Memory Box bridge started');

        // Add a command
        const commandId = await client.addCommand(
            'docker ps -a',
            'List all containers',
            { tags: ['docker', 'containers'] }
        );
        console.log('Added command:', commandId);

        // Search with fuzzy matching
        const results = await client.searchCommands('doker', { fuzzy: true });
        console.log('Search results:', results);

        // Get all tags
        const tags = await client.getAllTags();
        console.log('All tags:', tags);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.stop();
    }
}
