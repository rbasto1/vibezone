export interface Conversation {
  id: string;
  title: string;
  mapping: Record<string, ConversationNode>;
  create_time: number;
  update_time: number;
  moderation_results: unknown[];
  current_node: string;
  plugin_ids: null;
  conversation_id: string;
  conversation_template_id: string | null;
  gizmo_id: string | null;
  gizmo_type: "snorlax" | "gpt" | null;
  is_archived: boolean;
  is_starred: null;
  safe_urls: string[];
  blocked_urls: unknown[];
  default_model_slug: string | null;
  conversation_origin: null;
  is_read_only: null;
  voice: string | null;
  async_status: 2 | 4 | null;
  disabled_tool_ids: unknown[];
  is_do_not_remember: boolean | null;
  memory_scope: "global_enabled" | "project_enabled";
  context_scopes: null;
  sugar_item_id: null;
  sugar_item_visible: boolean;
  is_study_mode: boolean;
  owner: null;
}

export interface ConversationNode {
  id: string;
  message: ConversationNodeMessage | null;
  parent: string | null;
  children: string[];
}

export interface ConversationNodeMessage {
  id: string;
  author: {
    role: string;
    name: string | null;
    metadata: {
      sonicberry_model_id?: string;
      real_author?: string;
      source?: string;
    };
  };
  create_time: number | null;
  update_time: number | null;
  content: ConversationNodeMessageContent;
  status: "finished_successfully" | "in_progress";
  end_turn: boolean | null;
  weight: 0 | 1;
  metadata: Record<string, unknown>;
  recipient:
    | "all"
    | "web.search"
    | "file_search.msearch"
    | "bio"
    | "assistant"
    | "web"
    | "web.run"
    | "python"
    | "web.open_url"
    | "browser"
    | "myfiles_browser";
  channel: "final" | null;
}

export type ConversationNodeMessageContent =
  | ConversationNodeMessageContentText
  | ConversationNodeMessageContentMultimodalText
  | ConversationNodeMessageContentThoughts
  | ConversationNodeMessageContentReasoningRecap
  | ConversationNodeMessageContentUserEditableContext
  | ConversationNodeMessageContentCode
  | ConversationNodeMessageContentTetherBrowsingDisplay
  | ConversationNodeMessageContentExecutionOutput
  | ConversationNodeMessageContentTetherQuote
  | ConversationNodeMessageContentSystemError;

export interface ConversationNodeMessageContentText {
  content_type: "text";
  parts: string[];
}

export interface ConversationNodeMessageContentMultimodalText {
  content_type: "multimodal_text";
  parts: Array<MultimodalTextPart | string>;
}

export interface ConversationNodeMessageContentThoughts {
  content_type: "thoughts";
  thoughts: MessageContentThoughtsThought[];
  source_analysis_msg_id: string;
}

export interface ConversationNodeMessageContentReasoningRecap {
  content_type: "reasoning_recap";
  content: string;
}

export interface ConversationNodeMessageContentUserEditableContext {
  content_type: "user_editable_context";
  user_profile: string;
  user_instructions: string;
}

export interface ConversationNodeMessageContentCode {
  content_type: "code";
  language: string;
  response_format_name: null;
  text: string;
}

export interface ConversationNodeMessageContentTetherBrowsingDisplay {
  content_type: "tether_browsing_display";
  result: string;
  summary: string;
  assets: unknown[];
  tether_id: null;
}

export interface ConversationNodeMessageContentExecutionOutput {
  content_type: "execution_output";
  text: string;
}

export interface ConversationNodeMessageContentTetherQuote {
  content_type: "tether_quote";
  url: string;
  domain: string;
  text: string;
  title: string;
  tether_id: null;
}

export interface ConversationNodeMessageContentSystemError {
  content_type: "system_error";
  name: string;
  text: string;
}

export type MultimodalTextPart =
  | MultimodalTextPartImageAssetPointer
  | MultimodalTextPartAudioAssetPointer
  | MultimodalTextPartAudioTranscription
  | MultimodalTextPartRealTimeUserAudioVideoAssetPointer;

export interface MultimodalTextPartImageAssetPointer {
  content_type: "image_asset_pointer";
  asset_pointer: string;
  size_bytes: number;
  width?: number;
  height?: number;
  fovea: null;
  metadata: MultimodalTextPartMetadata;
}

export interface MultimodalTextPartAudioAssetPointer {
  content_type: "audio_asset_pointer";
  asset_pointer: string;
  expiry_datetime?: string;
  format: string;
  metadata: MultimodalTextPartMetadata;
}

export interface MultimodalTextPartAudioTranscription {
  content_type: "audio_transcription";
  text: string;
  direction: "in" | "out";
  decoding_id: null;
}

export interface MultimodalTextPartRealTimeUserAudioVideoAssetPointer {
  content_type: "real_time_user_audio_video_asset_pointer";
  audio_asset_pointer: ConversationPartAutioAssetPointer;
  expiry_datetime?: string;
  frames_asset_pointers: unknown[];
  video_container_asset_pointer: null;
  audio_start_timestamp: number;
}

export interface MultimodalTextPartMetadata {
  dalle?: null;
  gizmo?: null;
  generation?: null;
  container_pixel_height?: null;
  container_pixel_width?: null;
  emu_omit_glimpse_image?: null;
  emu_patches_override?: null;
  lpe_keep_patch_ijhw?: null;
  sanitized?: boolean;
  asset_pointer_link?: null;
  watermarked_asset_pointer?: null;
  start_timestamp?: null;
  end_timestamp?: null;
  pretokenized_vq?: null;
  interruptions?: null;
  original_audio_source?: null;
  transcription?: null;
  word_transcription?: null;
  start?: number;
  end?: number;
}

export interface ConversationPartAutioAssetPointer {
  content_type: "audio_asset_pointer";
  expiry_datetime?: string;
  asset_pointer: string;
  size_bytes: number;
  format: string;
  metadata: {
    start_timestamp: null;
    end_timestamp: null;
    pretokenized_vq: null;
    interruptions: null;
    original_audio_source: null;
    transcription: null;
    word_transcription: null;
    start: number;
    end: number;
  };
}

export interface MessageContentThoughtsThought {
  summary: string;
  content: string;
  chunks: string[];
  finished: boolean;
}
