### **📁 `instruction.md`**

`# Project: FLP AcademyWorks – HTML MVP Screens (Cursor AI Instructions)`

`This Cursor AI instruction will generate HTML screens for a mobile-first MVP experience. It uses Tailwind CSS for styling, and should reflect the sophistication of a modern fintech content platform.`

`---`

`## 🌟 Brand Info`

`` - **Brand Color (Primary)**: `#FDCB13` ``  
`` - **Dark Background**: `#0B0B0B` ``  
`- **Font**: System Sans (or optionally Inter/Roboto if available)`  
`- **Tagline**: _“Your personal trading mentor, market toolkit, and daily challenge – all in your pocket.”_`

`This tagline should be visible in the splash screen and profile page, and embedded as a meta description for SEO/PWA.`

`---`

`## ⚙️ Cursor Setup Instructions`

`1. **Create project** with HTML + Tailwind`  
``2. **Include Tailwind config** in `<head>`:``

```` ```html ````  
`<script src="https://cdn.tailwindcss.com"></script>`  
`<script>`  
  `tailwind.config = {`  
    `theme: {`  
      `extend: {`  
        `colors: {`  
          `primary: '#FDCB13',`  
          `dark: '#0B0B0B'`  
        `}`  
      `}`  
    `}`  
  `}`  
`</script>`

3. **Add Meta Tags** for iOS App / SEO:

`<meta name="theme-color" content="#0B0B0B" />`  
`<meta name="description" content="Your personal trading mentor, market toolkit, and daily challenge – all in your pocket." />`  
`<meta name="apple-mobile-web-app-capable" content="yes" />`

---

## **✅ Pages to Generate**

### **1\. `index.html` — Home Feed (Exclusive Content)**

* Vertical scroll of TikTok-style videos

* Video cards with title, views, and CTA buttons

* Floating center “➕ Trade” button

* Top nav: FLP logo \+ notification bell

* Fixed bottom navbar (active \= Home)

---

### **2\. `signals.html` — Signals Page**

* Tabs: Live Signals, History, Leaderboard

* Signal card with:

  * Pair, Buy/Sell, Entry, SL/TP

  * Risk % \+ Confidence Meter

  * "Explain this Signal" button

---

### **3\. `education.html` — Education Hub**

* Horizontal filters: Strategy, Psychology, MT4, Beginner, etc.

* Cards: Thumbnail \+ title \+ tags

* Search bar

* Completed tracking

---

### **4\. `profile.html` — User Profile**

* Avatar, username, XP badges

* Tagline beneath profile header

* Watch history

* Saved content

* Referral link

* Connect MT4/MT5

* Logout

---

## **📱 Fixed Bottom Navigation**

Shared across all pages:

`<nav class="fixed bottom-0 left-0 right-0 bg-white shadow-md flex justify-around items-center py-2 text-sm">`  
  `<a href="/index.html" class="text-primary text-center">`  
    `<div>🏠</div>`  
    `<div>Home</div>`  
  `</a>`  
  `<a href="/signals.html" class="text-gray-500 text-center">`  
    `<div>📊</div>`  
    `<div>Signals</div>`  
  `</a>`  
  `<button onclick="window.open('mt5://', '_blank')" class="bg-primary text-white rounded-full p-4 -mt-6 shadow-lg">`  
    `➕`  
  `</button>`  
  `<a href="/education.html" class="text-gray-500 text-center">`  
    `<div>📚</div>`  
    `<div>Learn</div>`  
  `</a>`  
  `<a href="/profile.html" class="text-gray-500 text-center">`  
    `<div>👤</div>`  
    `<div>Me</div>`  
  `</a>`  
`</nav>`

---

## **✨ MVP Enhancement Tips**

* Use rounded cards with slight shadows

* Animate elements on scroll (e.g. AOS.js or simple Tailwind transitions)

* Apply grayscale hover for image thumbnails

* Stick to a 1-column mobile grid (max-w-md center aligned)

