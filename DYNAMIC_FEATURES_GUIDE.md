# 🚀 Dynamic "Coming Soon" System with Git Integration

## 📋 **How It Functions:**

The dynamic "Coming Soon" system automatically tracks features from Git commit messages and updates the UI during each deployment. This creates a living, self-updating feature announcement system.

### **🔄 Automatic Workflow:**

1. **Developer commits** with specific keywords in commit messages
2. **Build script runs** during deployment (`npm run prebuild`)
3. **Git history is parsed** for feature information
4. **Features manifest** is generated (`public/features.json`)
5. **UI automatically updates** to show coming soon indicators
6. **Users see current status** without manual updates

---

## 🎯 **Commit Message Conventions:**

### **Released Features:**
```bash
git commit -m "feat: House-based color theming
Added personalized navbar colors for different houses"
```

### **Coming Soon Features:**
```bash
git commit -m "feat: Coming soon - Goals & Reflections System
Student goal setting and daily reflection tracking with progress analytics"
```

### **Work in Progress:**
```bash
git commit -m "feat: WIP - Advanced Analytics Dashboard
Charts and insights for learning progress across curriculum phases"
```

### **Planned Features:**
```bash
git commit -m "feat: TODO - AI Mentor Matching
Smart pairing algorithm based on learning styles and availability"
```

---

## ⚙️ **Technical Implementation:**

### **1. Build-Time Feature Extraction:**
```json
// package.json
{
  "scripts": {
    "prebuild": "node scripts/extractFeatures.js",
    "build": "react-scripts build"
  }
}
```

### **2. Generated Features Manifest:**
```json
{
  "generatedAt": "2025-10-05T03:38:45.709Z",
  "version": "0.1.0",
  "features": {
    "comingSoon": [
      {
        "id": "feature-c55ee7a3",
        "title": "Advanced Analytics Dashboard",
        "description": "Student progress analytics with charts and insights",
        "status": "coming-soon",
        "dateAdded": "2025-10-05",
        "estimatedRelease": "2025-10-19"
      }
    ]
  },
  "pathMappings": {
    "/analytics": "coming-soon",
    "/goals": "available"
  }
}
```

### **3. React Hook Integration:**
```typescript
// In Navigation.tsx
import { useFeaturesManifest } from '../../hooks/useFeaturesManifest';

const { shouldShowComingSoon, getWhatsNewFeatures } = useFeaturesManifest();

// Dynamic coming soon detection
const navigationItems = [
  {
    label: 'Analytics',
    path: '/analytics',
    comingSoon: shouldShowComingSoon('/analytics') // ✅ Auto-detected
  }
];
```

---

## 🎨 **UI Benefits:**

### **Automatic Coming Soon Indicators:**
- ✅ **Desktop**: "Analytics Coming soon" text next to nav items
- ✅ **Mobile**: "Soon" badge on bottom navigation
- ✅ **Disabled Links**: Prevents navigation to incomplete features
- ✅ **Visual Styling**: Grayed out appearance for pending features

### **Dynamic What's New Modal:**
- ✅ **Recent Features**: Auto-populated from Git commits
- ✅ **Release Dates**: Extracted from commit timestamps  
- ✅ **Feature Descriptions**: Pulled from commit message bodies
- ✅ **Author Information**: Shows who implemented each feature

---

## 🚀 **Deployment Integration:**

### **CI/CD Pipeline Integration:**
```yaml
# .github/workflows/deploy.yml
- name: Extract Features
  run: npm run extract-features

- name: Build
  run: npm run build

- name: Deploy
  run: npm run deploy
```

### **Vercel/Netlify Integration:**
```json
// vercel.json
{
  "builds": [
    {
      "src": "scripts/extractFeatures.js",
      "use": "@vercel/node"
    }
  ],
  "buildCommand": "npm run prebuild && npm run build"
}
```

---

## 📊 **Feature Status Tracking:**

### **Status Categories:**
- 🟢 **Released**: Feature is live and working
- 🟡 **Coming Soon**: Feature committed but not deployed  
- 🔵 **In Development**: Work in progress (WIP commits)
- ⚪ **Planned**: TODO items for future development

### **Automatic Status Detection:**
- **"feat: Coming soon"** → `coming-soon` status
- **"feat: WIP"** → `in-development` status  
- **"feat: TODO"** → `planned` status
- **"feat:"** (default) → `released` status

---

## 🎯 **Example Usage:**

### **Commit Workflow:**
```bash
# 1. Start feature development
git commit -m "feat: Coming soon - Student Analytics
Comprehensive dashboard for tracking learning progress"

# 2. Deploy - users see "Coming soon" indicator
npm run build  # Feature shows as "coming soon"

# 3. Complete feature
git commit -m "feat: Complete Student Analytics Dashboard  
Added charts, progress tracking, and performance insights"

# 4. Deploy - feature becomes available
npm run build  # Feature shows as "released", appears in What's New
```

### **Result in UI:**
- **Navigation**: "Analytics" shows "Coming soon" text
- **What's New**: Shows recent releases with dates
- **Admin Panel**: Can track feature completion status
- **User Experience**: Clear expectations about upcoming features

---

## 🔧 **Customization Options:**

### **Keyword Customization:**
```javascript
// scripts/extractFeatures.js
const FEATURE_KEYWORDS = [
  'feat:', 'feature:', 'add:', 'new:', 'implement:',
  'coming soon', 'wip:', 'todo:', 'placeholder'
];
```

### **Release Date Estimation:**
```javascript
// Auto-estimate release dates
estimateReleaseDate(commitDate) {
  const date = new Date(commitDate);
  date.setDate(date.getDate() + 14); // 2 weeks from commit
  return date.toISOString().split('T')[0];
}
```

### **Path Mapping Rules:**
```javascript
// Automatically map features to routes
const pathFeatureMap = {
  '/analytics': ['analytics', 'dashboard', 'reports'],
  '/goals': ['goal', 'reflection', 'progress'],
  '/journey': ['journey', 'timeline', 'curriculum']
};
```

---

## ✅ **Benefits Summary:**

1. **🤖 Automated**: No manual feature list maintenance
2. **📱 Real-time**: Updates with every deployment  
3. **🎯 Accurate**: Source of truth is Git commit history
4. **👥 Team-friendly**: Works with any developer's commits
5. **🔄 Self-maintaining**: Features automatically move from "coming soon" to "released"
6. **📊 Trackable**: Full audit trail of feature development
7. **🎨 User-friendly**: Clear visual indicators and expectations

This system transforms Git commits into a dynamic feature management system that keeps users informed about upcoming functionality while providing a professional, polished user experience! 🎉