function toggleGuide() {
    const content = document.getElementById('guideContent');
    const arrow = document.getElementById('guideArrow');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.classList.add('rotate');
    } else {
        content.classList.add('hidden');
        arrow.classList.remove('rotate');
    }
}

const zipInput = document.getElementById('zipInput');
const statusMsg = document.getElementById('statusMsg');

zipInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

async function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return alert("Please upload a .zip file!");
    statusMsg.textContent = "Applying Vanessa Standard Filter... 🛡️";
    
    try {
        const zip = await JSZip.loadAsync(file);

        async function getJson(fileName) {
            const path = Object.keys(zip.files).find(p => p.endsWith(fileName));
            return path ? JSON.parse(await zip.file(path).async("string")) : null;
        }

        const following = await getJson("following.json");
        const followers = await getJson("followers_1.json");
        const pending = await getJson("pending_follow_requests.json");
        const blocked = await getJson("blocked_profiles.json");
        const storyHide = await getJson("hide_story_from.json");

        // Helper: The "Vanessa Standard" Check
        // 1. Must not start with __deleted__
        // 2. If 'Name' data exists, it must not be empty
        const validateAccount = (item) => {
            const username = item.title || item.string_list_data?.[0]?.value || item.label_values?.find(l => l.label === "Username")?.value;
            const nameField = item.label_values?.find(l => l.label === "Name")?.value;

            if (!username || username.startsWith('__deleted__')) return { valid: false, username };
            
            // If the file provides a 'Name' field (like Pending or Blocked files), it must not be empty
            if (nameField !== undefined && nameField.trim() === "") return { valid: false, username };

            return { valid: true, username };
        };

        // 1. Process Following (Standard vs Ghosts)
        const rawFollowing = following?.relationships_following || [];
        const activeFollowing = [];
        const ghostAccounts = [];

        rawFollowing.forEach(item => {
            const result = validateAccount(item);
            if (result.valid) activeFollowing.push(result.username);
            else ghostAccounts.push(result.username);
        });

        // 2. Process Followers (Standard only)
        const activeFollowers = (followers || []).map(item => {
            const result = validateAccount(item);
            return result.valid ? result.username : null;
        }).filter(Boolean);

        // 3. Process Pending Requests (Apply strict Name check)
        const activePending = [];
        (pending || []).forEach(item => {
            const result = validateAccount(item);
            if (result.valid) activePending.push(result.username);
            else ghostAccounts.push(result.username); // Move empty-name requests to Ghost list
        });

        // 4. Non-Followers Logic
        const nonFollowers = activeFollowing.filter(name => !activeFollowers.includes(name));

        // 5. Update UI
        document.getElementById('followingCount').textContent = activeFollowing.length;
        document.getElementById('followerCount').textContent = activeFollowers.length;
        document.getElementById('nonFollowerCount').textContent = nonFollowers.length;

        fillList('nonFollowersList', nonFollowers);
        fillList('pendingList', activePending);
        fillList('ghostList', ghostAccounts);
        
        fillList('blockedList', (blocked || []).map(i => validateAccount(i).username));
        fillList('hiddenStoryList', (storyHide || []).map(i => validateAccount(i).username));

        document.getElementById('mainHeader').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Parsing failed. Check your console.");
    }
}

function fillList(id, items) {
    const el = document.getElementById(id);
    const valid = [...new Set(items?.filter(Boolean))];
    el.innerHTML = valid.length ? valid.map(i => `<li>${i}</li>`).join('') : "<li>None found</li>";
}