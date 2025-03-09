export interface CreateQuestionRequestBody {
  title: string;
  content: string;
  tags: string[];
  mentions: string[];
  medias: string[];
}

export interface EditQuestionRequestBody {
  title?: string;
  content?: string;
  tags?: string[];
  mentions?: string[];
  medias?: string[];
}
