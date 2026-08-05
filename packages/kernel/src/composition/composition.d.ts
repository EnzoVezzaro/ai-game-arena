import { Container } from '../dependency-injection/container';
export interface CompositionConfig {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    logComponent?: string;
    dataDir?: string;
}
export declare function createContainer(config?: CompositionConfig): Container;
//# sourceMappingURL=composition.d.ts.map