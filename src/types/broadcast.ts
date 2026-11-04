export type AudienceTarget = "dm" | "groups" | "all";
export type BroadcastDeliveryMode = "copy" | "forward";
export type BroadcastContentType = "single" | "sequence" | "album";
export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
export type JobStatus = "pending" | "processing" | "sent" | "retry_wait" | "failed" | "skipped";

export interface BroadcastContentItem {
  message_id: number;
  from_chat_id: number;
  type:
    | "text"
    | "photo"
    | "video"
    | "document"
    | "audio"
    | "voice"
    | "video_note"
    | "sticker"
    | "animation"
    | "poll";
  text?: string;
  caption?: string;
}

export interface BroadcastDraft {
  campaignId: string;
  name: string;
  audienceFilter: AudienceTarget; // 'dm' | 'groups' | 'all'
  mode: BroadcastDeliveryMode; // 'copy' | 'forward'
  contentType: BroadcastContentType;
  items: BroadcastContentItem[];
  buttons: any[][];
  pinMode: "none" | "quiet" | "loud";
  pinItemIndex: number;
  tagAllEnabled: boolean;
  isSilent: boolean;
  protectContent: boolean;
  disableLinkPreview: boolean;
  scheduledAt?: number;
}
