const fs = require('fs');

const files = fs.readdirSync('public/pages').filter(f => f.endsWith('.html'));

const themeScript = `
<script>
  (function() {
    const theme = localStorage.getItem('roomsync-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
`;

for (const file of files) {
    let content = fs.readFileSync('public/pages/' + file, 'utf8');
    if (!content.includes('localStorage.getItem("roomsync-theme")') && !content.includes("localStorage.getItem('roomsync-theme')")) {
        content = content.replace('<head>', '<head>\\n' + themeScript);
        fs.writeFileSync('public/pages/' + file, content);
    }
}

// Update navbar.js to set attribute on documentElement instead of body
let navbarContent = fs.readFileSync('public/js/navbar.js', 'utf8');
navbarContent = navbarContent.replace(/document\.body\.setAttribute/g, 'document.documentElement.setAttribute');
navbarContent = navbarContent.replace(/document\.body\.getAttribute/g, 'document.documentElement.getAttribute');
fs.writeFileSync('public/js/navbar.js', navbarContent);

console.log('FOUC script injected.');
