import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

// This component is publicly accessible and does not require authentication
interface DocViewerProps {
  title: string;
  content: string;
  onClose: () => void;
  onDownload: () => void;
  isTechnicalWhitepaper?: boolean;
  isLoading?: boolean;
  toc?: {id: string, title: string, level: number}[];
  activeSection?: string;
  onSectionChange?: (id: string) => void;
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
  onSectionChange
}) => {
  // Simple markdown renderer for the technical whitepaper with improved ID generation
  const renderMarkdown = (markdown: string) => {
    // Reset header counter for each document
    let headerCounter = 0;
    
    // Convert headers with improved ID generation
    let html = markdown
      .replace(/^# (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h1 id="${id}" class="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">${title}</h1>`;
      })
      .replace(/^## (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h2 id="${id}" class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white">${title}</h2>`;
      })
      .replace(/^### (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h3 id="${id}" class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">${title}</h3>`;
      })
      .replace(/^#### (.*$)/gm, (match, title) => {
        headerCounter++;
        const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
        return `<h4 id="${id}" class="text-lg font-bold mt-3 mb-2 text-gray-900 dark:text-white">${title}</h4>`;
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
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg my-4 overflow-x-auto"><code class="text-sm text-gray-800 dark:text-gray-200">$1</code></pre>');
    
    // Convert inline code
    html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-gray-800 dark:text-gray-200">$1</code>');
    
    // Convert blockquotes
    html = html.replace(/^>\s(.*)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 text-gray-600 dark:text-gray-400">$1</blockquote>');
    
    // Convert tables
    html = html.replace(/\|(.*?)\|/g, '<td class="border border-gray-300 dark:border-gray-600 px-4 py-2">$1</td>');
    html = html.replace(/<td.*?<\/td>/g, (match) => `<tr>${match}</tr>`);
    html = html.replace(/<tr>.*?<\/tr>/g, (match) => `<table class="table-auto border-collapse border border-gray-300 dark:border-gray-600 my-4">${match}</table>`);
    
    // Convert paragraphs
    html = html.replace(/^\s*(.+?)$/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300">$1</p>');
    
    return html;
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
        if (rect.top <= 100 && rect.bottom >= 100) {
          currentSection = header.id;
        }
      });
      
      if (currentSection !== activeSection) {
        onSectionChange?.(currentSection);
      }
    };

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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onDownload}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content with indefinite scrolling */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700 dark:text-gray-300">Loading document...</span>
          </div>
        ) : (
          <div className="p-6">
            {isTechnicalWhitepaper ? (
              <div 
                className="prose prose-blue dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {content}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocViewer;