import React, { useState, useEffect } from 'react';
import { X, Download, ThumbsUp, ThumbsDown, ChevronRight, ChevronLeft, Home } from 'lucide-react';
import DOMPurify from 'dompurify';

// This component is publicly accessible and does not require authentication
interface DocViewerProps {
  title: string;
  content: string;
  onClose: () => void;
  onDownload: () => void;
  isTechnicalWhitepaper?: boolean;
  isLoading?: boolean;
  toc?: { id: string, title: string, level: number }[];
  activeSection?: string;
  onSectionChange?: (id: string) => void;
  categoryTitle?: string;
  nextDoc?: { id: string; title: string } | null;
  prevDoc?: { id: string; title: string } | null;
  onNavigate?: (id: string) => void;
}

const DocViewer: React.FC<DocViewerProps> = ({
  title,
  content,
  onClose,
  onDownload,
  isTechnicalWhitepaper = false,
  isLoading = false,
  toc = [],
  activeSection = '',
  onSectionChange,
  categoryTitle,
  nextDoc,
  prevDoc,
  onNavigate
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  // Reset feedback when document changes
  useEffect(() => {
    setFeedbackGiven(null);
  }, [title]);

  // Simple markdown renderer for the technical whitepaper with improved ID generation
  // SECURITY: Sanitizes HTML output with DOMPurify to prevent XSS attacks
  const renderMarkdown = (markdown: string) => {
    // Reset header counter for each document
    let headerCounter = 0;

    // Convert headers with improved ID generation
    let html = markdown
      .replace(/^# (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h1 id="${id}" class="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white scroll-mt-24">${title}</h1>`;
      })
      .replace(/^## (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h2 id="${id}" class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white scroll-mt-24">${title}</h2>`;
      })
      .replace(/^### (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h3 id="${id}" class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white scroll-mt-24">${title}</h3>`;
      })
      .replace(/^#### (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h4 id="${id}" class="text-lg font-bold mt-3 mb-2 text-gray-900 dark:text-white scroll-mt-24">${title}</h4>`;
      });

    // Convert lists
    html = html.replace(/^\s*-\s(.*)$/gm, '<li class="ml-6 text-gray-700 dark:text-gray-300">$1</li>');
    html = html.replace(/(<li class="ml-6 text-gray-700 dark:text-gray-300">.*<\/li>)+/g, '<ul class="list-disc my-4">$&</ul>');

    // Convert ordered lists
    html = html.replace(/^\s*\d+\.\s(.*)$/gm, '<li class="ml-6 text-gray-700 dark:text-gray-300">$1</li>');
    html = html.replace(/(<li class="ml-6 text-gray-700 dark:text-gray-300">.*<\/li>)+/g, '<ol class="list-decimal my-4 ml-4">$&</ol>');

    // Convert bold and italic
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>');

    // Convert links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg my-4 overflow-x-auto border border-gray-200 dark:border-gray-700"><code class="text-sm text-gray-800 dark:text-gray-200 font-mono">$1</code></pre>');

    // Convert inline code
    html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm text-gray-800 dark:text-gray-200 font-mono border border-gray-200 dark:border-gray-700">$1</code>');

    // Convert blockquotes
    html = html.replace(/^>\s(.*)$/gm, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4 my-4 text-gray-700 dark:text-gray-300 rounded-r-lg">$1</blockquote>');

    // Convert tables
    html = html.replace(/\|(.*?)\|/g, '<td class="border border-gray-300 dark:border-gray-600 px-4 py-2">$1</td>');
    html = html.replace(/<td.*?<\/td>/g, (match) => `<tr>${match}</tr>`);
    html = html.replace(/<tr>.*?<\/tr>/g, (match) => `<table class="table-auto border-collapse border border-gray-300 dark:border-gray-600 my-4 w-full">${match}</table>`);

    // Convert paragraphs
    html = html.replace(/^\s*(.+?)$/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">$1</p>');

    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'tr', 'td'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'id', 'class'],
      ALLOW_DATA_ATTR: false
    });
  };

  // Scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onSectionChange?.(id);
    }
  };

  // Handle scroll to detect active section
  useEffect(() => {
    const handleScroll = () => {
      const headers = document.querySelectorAll('h1, h2, h3, h4');
      let currentSection = '';

      headers.forEach(header => {
        const rect = header.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 100) {
          currentSection = header.id;
        }
      });

      if (currentSection && currentSection !== activeSection) {
        onSectionChange?.(currentSection);
      }
    };

    const container = document.querySelector('.doc-content-scroll');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection, onSectionChange]);

  // Handle scrollToSection event from parent
  useEffect(() => {
    const handleScrollToSection = (event: Event) => {
      const customEvent = event as CustomEvent;
      scrollToSection(customEvent.detail);
    };

    window.addEventListener('scrollToSection', handleScrollToSection);
    return () => window.removeEventListener('scrollToSection', handleScrollToSection);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full shadow-sm">
      {/* Header with Breadcrumbs */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col space-y-4">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <button onClick={onClose} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Home className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-medium text-gray-700 dark:text-gray-300">{categoryTitle || 'Docs'}</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[200px]">{title}</span>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={onDownload}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content with indefinite scrolling */}
      <div className="flex-1 overflow-y-auto doc-content-scroll scroll-smooth">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Loading document...</span>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="p-8 md:p-12">
              {isTechnicalWhitepaper ? (
                <div
                  className="prose prose-lg prose-blue dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {content}
                </pre>
              )}
            </div>

            {/* Feedback Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-8 md:p-12 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Was this page helpful?</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Your feedback helps us improve our documentation.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFeedbackGiven('up')}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all ${feedbackGiven === 'up'
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-500 hover:text-green-600'
                      }`}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Yes
                  </button>
                  <button
                    onClick={() => setFeedbackGiven('down')}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-all ${feedbackGiven === 'down'
                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-600'
                      }`}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            {(prevDoc || nextDoc) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 md:p-12 border-t border-gray-200 dark:border-gray-700">
                {prevDoc ? (
                  <button
                    onClick={() => onNavigate?.(prevDoc.id)}
                    className="group flex flex-col p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      {prevDoc.title}
                    </span>
                  </button>
                ) : (
                  <div />
                )}

                {nextDoc ? (
                  <button
                    onClick={() => onNavigate?.(nextDoc.id)}
                    className="group flex flex-col items-end p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-right"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-end group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      {nextDoc.title}
                    </span>
                  </button>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocViewer;