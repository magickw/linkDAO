import { useState, useEffect, useMemo } from 'react';

interface SupportDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  difficulty: string;
  readTime: string;
  popularity: number;
  views: number;
  lastUpdated: string;
  href?: string;
  path?: string;
  tags: string[];
}

interface DocumentNavigation {
  currentDocument: SupportDocument | null;
  previousDocument: SupportDocument | null;
  nextDocument: SupportDocument | null;
  relatedDocuments: SupportDocument[];
  categoryDocuments: SupportDocument[];
  navigationHistory: string[];
}

export const useDocumentNavigation = (
  documents: SupportDocument[],
  currentDocumentId: string | null,
  selectedCategory: string = 'all'
) => {
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track navigation history
  useEffect(() => {
    if (currentDocumentId && !navigationHistory.includes(currentDocumentId)) {
      setNavigationHistory(prev => [...prev.slice(-9), currentDocumentId]); // Keep last 10
    }
  }, [currentDocumentId, navigationHistory]);

  // Calculate scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = useMemo((): DocumentNavigation => {
    const currentDocument = documents.find(doc => doc.id === currentDocumentId) || null;
    
    if (!currentDocument) {
      return {
        currentDocument: null,
        previousDocument: null,
        nextDocument: null,
        relatedDocuments: [],
        categoryDocuments: [],
        navigationHistory
      };
    }

    // Get documents in the same category
    const categoryDocuments = documents.filter(doc => 
      selectedCategory === 'all' || doc.category === currentDocument.category
    ).sort((a, b) => b.popularity - a.popularity);

    const currentIndex = categoryDocuments.findIndex(doc => doc.id === currentDocumentId);
    
    // Previous and next documents in category
    const previousDocument = currentIndex > 0 ? categoryDocuments[currentIndex - 1] : null;
    const nextDocument = currentIndex < categoryDocuments.length - 1 ? categoryDocuments[currentIndex + 1] : null;

    // Related documents based on tags, category, and difficulty
    const relatedDocuments = documents
      .filter(doc => doc.id !== currentDocumentId)
      .map(doc => {
        let score = 0;
        
        // Same category gets high score
        if (doc.category === currentDocument.category) score += 10;
        
        // Same difficulty gets medium score
        if (doc.difficulty === currentDocument.difficulty) score += 5;
        
        // Shared tags get score based on number of matches
        const sharedTags = doc.tags.filter(tag => currentDocument.tags.includes(tag));
        score += sharedTags.length * 3;
        
        // Similar popularity gets small score
        const popularityDiff = Math.abs(doc.popularity - currentDocument.popularity);
        if (popularityDiff < 20) score += 2;
        
        return { ...doc, relevanceScore: score };
      })
      .filter(doc => doc.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    return {
      currentDocument,
      previousDocument,
      nextDocument,
      relatedDocuments,
      categoryDocuments,
      navigationHistory
    };
  }, [documents, currentDocumentId, selectedCategory, navigationHistory]);

  const navigateToDocument = (documentId: string) => {
    setNavigationHistory(prev => [...prev.slice(-9), documentId]);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const previousId = navigationHistory[navigationHistory.length - 2];
      setNavigationHistory(prev => prev.slice(0, -1));
      return previousId;
    }
    return null;
  };

  return {
    ...navigation,
    scrollProgress,
    navigateToDocument,
    goBack,
    canGoBack: navigationHistory.length > 1
  };
};

export default useDocumentNavigation;