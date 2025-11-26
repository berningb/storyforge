import { useMemo } from 'react';

export const useBreadcrumbs = ({ blogInfo, repo, onBack, repoOwner, activeTab, collectionName, itemName, characterName, locationName }) => {
  return useMemo(() => {
    const crumbs = [];
    
    if (blogInfo) {
      // IndexPage breadcrumbs
      if (blogInfo.repo) {
        const repoParts = blogInfo.repo.split('/').filter(Boolean);
        repoParts.forEach((part, index) => {
          crumbs.push({
            label: part,
            onClick: index === 0 
              ? () => {
                  window.location.hash = '#repos';
                  window.location.reload();
                }
              : onBack,
            isCurrent: false,
          });
        });
      }
      
      if (blogInfo.path) {
        const pathSegments = blogInfo.path.split('/').filter(Boolean);
        pathSegments.forEach((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          crumbs.push({
            label: segment,
            onClick: isLast ? undefined : onBack,
            isCurrent: isLast,
          });
        });
      }
    } else if (repo) {
      // RepoAnalysisPage breadcrumbs
      crumbs.push({
        label: repo.fullName.split('/')[0],
        onClick: onBack,
        isCurrent: false,
      });
      
      crumbs.push({
        label: repo.fullName.split('/')[1] || repo.fullName,
        onClick: undefined,
        isCurrent: true,
      });
    } else if (repoOwner || activeTab || collectionName || itemName || characterName || locationName) {
      // Detail page breadcrumbs
      if (repoOwner && onBack) {
        crumbs.push({
          label: repoOwner,
          onClick: onBack,
          isCurrent: false,
        });
      }
      
      if (activeTab && onBack) {
        crumbs.push({
          label: activeTab,
          onClick: onBack,
          isCurrent: false,
        });
      }
      
      if (collectionName && onBack) {
        crumbs.push({
          label: collectionName,
          onClick: onBack,
          isCurrent: false,
        });
      }
      
      if (characterName) {
        crumbs.push({
          label: 'Characters',
          onClick: onBack,
          isCurrent: false,
        });
        crumbs.push({
          label: characterName,
          onClick: undefined,
          isCurrent: true,
        });
      } else if (locationName) {
        crumbs.push({
          label: 'Locations',
          onClick: onBack,
          isCurrent: false,
        });
        crumbs.push({
          label: locationName,
          onClick: undefined,
          isCurrent: true,
        });
      } else if (itemName) {
        crumbs.push({
          label: itemName,
          onClick: undefined,
          isCurrent: true,
        });
      }
    }
    
    return crumbs;
  }, [blogInfo, repo, onBack, repoOwner, activeTab, collectionName, itemName, characterName, locationName]);
};

