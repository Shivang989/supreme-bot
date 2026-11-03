export type BroadcastScope = "global" | "dm_only";
export type BroadcastDeliveryMode = "copy" | "forward";
export type BroadcastContentType = "single" | "sequence" | "album";
export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
export type JobStatus = "pending" | "processing" | "sent" | "retry_wait" | "failed" | "skipped";

export interface BroadcastContentItem {
  message_id: number;
  from_chat_id: number;
  type: "text" | "photo" | "video" | "document" | "audio" | "voice" | "video_note" | "sticker" | "animation" | "poll";
  text?: string;
  caption?: string;
  file_id?: string;
  entities?: any[];
  caption_entities?: any[];
  media_group_id?: string;
}

export interface BroadcastDraft {
  campaignId: string;
  name: string;
  scope: BroadcastScope;
  mode: BroadcastDeliveryMode;
  contentType: BroadcastContentType;
  items: BroadcastContentItem[];
  buttons: any[][];
  audienceFilter: "all" | "private" | "groups" | "channels";
  pinMode: "none" | "quiet" | "loud";
  pinDestination: "all" | "groups" | "channels" | "private";
  pinItemIndex: number;
  tagAllEnabled: boolean;
  tagAllGroups: number[];
  isSilent: boolean;
  protectContent: boolean;
  disableLinkPreview: boolean;
  scheduledAt?: number; // Unix seconds
}
