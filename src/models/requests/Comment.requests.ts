export interface CreateCommentRequestBody {
  content: string;
  parent_id: string | null;
}

export interface UpdateCommentRequestBody {
  content: string;
}
