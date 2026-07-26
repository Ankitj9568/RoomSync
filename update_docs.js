const fs = require('fs');
const path = require('path');

function replaceInFile(filename, replacements) {
    const filePath = path.join(__dirname, 'docs', filename);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [search, replace] of replacements) {
        if (content.includes(search)) {
            content = content.replace(search, replace);
            console.log(`Replaced in ${filename}: ${search.substring(0, 30)}...`);
        } else {
            console.warn(`Could not find in ${filename}: ${search.substring(0, 30)}...`);
        }
    }
    
    fs.writeFileSync(filePath, content);
}

// 1. PRD.md Updates
replaceInFile('PRD.md', [
    [
        '- Cash & UPI Payment Recording',
        '- Cash & UPI Payment Recording (with Undo functionality)'
    ],
    [
        '## 7.1 User & Group Management',
        `## 7.1 User & Group Management\n- **Invite Links & QR Codes**: Users can generate a unique invite link and QR code to easily share with roommates.\n- **Join Workflows**: Admins can toggle between "Direct Join" (anyone with the link joins instantly) and "Admin Approval" (users request to join and must be approved).\n- **Group Settings Panel**: Admins can manage joining preferences, view pending join requests, and approve/reject them.`
    ],
    [
        '### 7.5 Payment Tracking',
        `### 7.5 Payment Tracking\n- **Record Payments**: Users can log cash or UPI transfers to settle balances.\n- **Undo Payments**: Users can undo accidental payments, which recalculates balances automatically.`
    ]
]);

// 2. TRD.md Updates
replaceInFile('TRD.md', [
    [
        '## 5. Database Architecture',
        `## 5. Database Architecture\nRoomSync uses SQLite for local development and MySQL for production. A custom migration script in \`config/db.js\` handles automatic synchronization of the MySQL schema upon startup when deployed, ensuring zero-downtime updates.`
    ]
]);

// 3. Database.md Updates
replaceInFile('Database.md', [
    [
        '- `group_id` (INT, PK, Auto-increment)',
        `- \`group_id\` (INT, PK, Auto-increment)\n- \`group_code\` (VARCHAR(50), UNIQUE) - Used for join invite links.\n- \`allow_direct_join\` (BOOLEAN, DEFAULT 1) - If false, users must be approved by admin.`
    ],
    [
        '## 6. Payments Table',
        `## 6. Payments Table\nStores settlement payments between users. Users can also soft-delete or undo payments.`
    ],
    [
        '## 1. Groups Table',
        `## 1.1 Join Requests Table (\`join_requests\`)\nManages pending requests when \`allow_direct_join\` is false.\n- \`request_id\` (INT, PK, Auto-increment)\n- \`group_id\` (INT, FK)\n- \`user_id\` (INT, FK)\n- \`status\` (VARCHAR, 'pending', 'approved', 'rejected')\n- \`created_at\` (TIMESTAMP)\n\n## 1. Groups Table`
    ]
]);

// 4. UI_UX.md Updates
replaceInFile('UI_UX.md', [
    [
        '### 1. Color Palette',
        `### 1. Color Palette\nThe application supports a full Light/Dark Theme toggle. The system detects OS preferences and allows manual override, seamlessly preventing FOUC (Flash of Unstyled Content).`
    ]
]);

// 5. API.md Updates
replaceInFile('API.md', [
    [
        '## POST `/api/groups/join`',
        `## GET \`/api/groups/code/:code\`\n### Purpose\nFetch group details publicly using an invite code to display the join screen.\n\n## POST \`/api/groups/join\``
    ]
]);

// 6. Implementation.md Updates
replaceInFile('Implementation.md', [
    [
        '## 3. Deployment Flow',
        `## 3. Deployment Flow\n### Railway MySQL Deployment\nThe application uses a custom auto-migration script within \`config/db.js\` to synchronize new schema updates (like \`join_requests\` and \`group_code\`) directly into the production MySQL database on server startup.\n`
    ]
]);

console.log("Docs updated successfully.");
