export interface CreateReplyRequestBody {
  content: string;
  medias: string[];
  parent_id: string | null;
}

export interface EditReplyRequestBody {
  content?: string;
  medias?: string[];
}
