import { AuthService } from '../auth.service';
declare const LocalSStrategy_base: new (...args: any) => any;
export declare class LocalSStrategy extends LocalSStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<any>;
}
export {};
