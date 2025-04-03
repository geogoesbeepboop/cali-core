export class SeriesRequestDto {
  seriesIds: string[];
}

export class AddSeriesDto {
  seriesId: string;
}

export class SeriesResponseDto {
  id: string;
  title: string;
  observations: {
    date: string;
    value: string | number;
  }[];
  frequency: string;
  units: string;
  lastUpdated: string;
}

export class McpContextResponseDto {
  contexts: {
    contextId: string;
    type: string;
    content: any;
    metadata: {
      source: string;
      timestamp: string;
      seriesId?: string;
      title?: string;
      frequency?: string;
      units?: string;
      lastUpdated?: string;
    };
  }[];
}
