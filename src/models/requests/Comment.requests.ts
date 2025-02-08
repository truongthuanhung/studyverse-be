export interface CreateCommentRequestBody {
  post_id: string;
  content: string;
  parent_id: string | null;
}

export interface UpdateCommentRequestBody {
  content: string;
}
