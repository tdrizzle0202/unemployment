import { FileText } from 'lucide-react';

interface Citation {
  section_id: string;
  section_title: string;
  content_excerpt: string;
}

interface CitationLinkProps {
  citation: Citation;
}

export function CitationLink({ citation }: CitationLinkProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3">
        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {citation.section_id}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">
            {citation.section_title}
          </p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {citation.content_excerpt}
          </p>
        </div>
      </div>
    </div>
  );
}
