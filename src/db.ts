import { MongoClient, Db, Collection } from "mongodb";
import { ENV } from "./env";

export interface UserSessionData {
    userId: string;
    sessionString?: string;
    firstName?: string;
    username?: string;
    status?: "ACTIVE" | "REVOKED" | string;
    assistEnabled?: boolean;
    customPersona?: string;
    [key: string]: any;
}

export interface WatcherEntry {
    _id?: any;
    sessionUserId: string;
    sourceChatId: string;
    destinationChatId: string;
    active: boolean;
    [key: string]: any;
}

export interface PendingCommand {
    _id?: any;
    eventKey: string;
    chatId: string;
    messageId: number;
    senderId?: string;
    text?: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
    createdAt: Date | number;
    [key: string]: any;
}

export interface VaultItem {
    _id?: any;
    userId: string;
    name: string;
    text?: string;
    media?: any;
    createdAt: Date | number;
    [key: string]: any;
}

export interface ScheduledTask {
    _id?: any;
    userId?: any;
    chatId: string;
    isChannel?: boolean;
    message: string;
    nextRun?: number;
    interval?: number;
    remaining?: number;
    executeAt?: Date | number;
    status: "PENDING" | "COMPLETED" | "CANCELLED" | string;
    createdAt?: Date | number;
    [key: string]: any;
}

export interface CloneBackup {
    _id?: any;
    userId: string;
    firstName: string;
    lastName: string;
    about: string;
    hasClonedPhoto: boolean;
    createdAt: Date | number;
    [key: string]: any;
}

export class DatabaseService {
    public client!: MongoClient;
    public db!: Db;
    public sessions!: Collection<UserSessionData>;
    public pendingCommands!: Collection<PendingCommand>;
    public vault!: Collection<VaultItem>;
    public tasks!: Collection<ScheduledTask>;
    public contacts!: Collection<any>;
    public watchers!: Collection<WatcherEntry>;
    public botConfig!: Collection<any>;
    public userStates!: Collection<any>;
    public quickDm!: Collection<any>;
    public cloneBackups!: Collection<CloneBackup>;

    public async connect(): Promise<void> {
        const uri = (ENV.MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
        if (!uri) {
            throw new Error("MONGODB_URI environment variable is not defined.");
        }

        this.client = new MongoClient(uri);
        await this.client.connect();
        this.db = this.client.db();

        // Initialize collections
        this.sessions = this.db.collection<UserSessionData>("sessions");
        this.pendingCommands = this.db.collection<PendingCommand>("pending_commands");
        this.vault = this.db.collection<VaultItem>("vault");
        this.tasks = this.db.collection<ScheduledTask>("tasks");
        this.contacts = this.db.collection<any>("contacts");
        this.watchers = this.db.collection<WatcherEntry>("watchers");
        this.botConfig = this.db.collection<any>("bot_config");
        this.userStates = this.db.collection<any>("user_states");
        this.quickDm = this.db.collection<any>("quick_dm");
        this.cloneBackups = this.db.collection<CloneBackup>("clone_backups");

        // Enforce unique indexes
        await this.sessions.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
        await this.pendingCommands.createIndex({ eventKey: 1 }, { unique: true }).catch(() => {});
        await this.cloneBackups.createIndex({ userId: 1 }, { unique: true }).catch(() => {});

        console.log("✅ [DB] Connected to MongoDB and collections initialized.");
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }
}

export const DB = new DatabaseService();
export default DB;

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
