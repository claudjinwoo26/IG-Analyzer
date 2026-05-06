const zipInput = document.getElementById('zipInput');
const statusMsg = document.getElementById('statusMsg');

zipInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

async function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return alert("Please upload a .zip file!");
    statusMsg.textContent = "Filtering ghosts... 👻";
    
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
        const restricted = await getJson("restricted_profiles.json");
        const storyHide = await getJson("hide_story_from.json");
        const closeFriends = await getJson("close_friends.json");

        // Helper to check if an account is deleted/deactivated
        const isGhost = (name) => !name || name.startsWith('__deleted__') || name.includes('deleted_user');

        // 1. Process Following (Separate Active vs Ghost)
        const rawFollowing = following?.relationships_following?.map(i => i.title) || [];
        const followList = rawFollowing.filter(name => !isGhost(name));
        const ghostFollowing = rawFollowing.filter(name => isGhost(name));

        // 2. Process Followers[cite: 1]
        const followerList = followers?.map(i => i.string_list_data?.[0]?.value).filter(name => name && !isGhost(name)) || [];

        // 3. Logic for Non-Followers (Excluding Ghosts)[cite: 1]
        const nonFollowers = followList.filter(name => !followerList.includes(name));

        // 4. Update Header Stats (Active Only)
        document.getElementById('followingCount').textContent = followList.length;
        document.getElementById('followerCount').textContent = followerList.length;
        document.getElementById('nonFollowerCount').textContent = nonFollowers.length;

        // 5. Fill Cards with labels[cite: 1]
        const extractUsername = (data, path) => {
            if (!data) return [];
            // Handle both structure types (label_values or direct string_list_data)[cite: 1]
            return data.map(i => {
                const name = i.label_values?.find(l => l.label === "Username")?.value || i.string_list_data?.[0]?.value;
                return isGhost(name) ? null : name;
            }).filter(Boolean);
        };

        fillList('nonFollowersList', nonFollowers);
        fillList('ghostList', ghostFollowing);
        fillList('pendingList', extractUsername(pending));
        fillList('blockedList', extractUsername(blocked));
        fillList('restrictedList', extractUsername(restricted));
        fillList('hiddenStoryList', extractUsername(storyHide));
        fillList('closeFriendsList', extractUsername(closeFriends));

        document.getElementById('mainHeader').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Parsing failed. Ensure your JSON export is correct.");
    }
}

function fillList(id, items) {
    const el = document.getElementById(id);
    const valid = items?.filter(Boolean) || [];
    el.innerHTML = valid.length ? valid.map(i => `<li>${i}</li>`).join('') : "<li>None found</li>";
}