#!/usr/bin/env node
/**
 * test-endpoints.mjs
 * Tests all major Bubble Space API endpoints including the new
 * conversation-context endpoint.
 */

const BASE = 'https://bubble-backend-production-96a0.up.railway.app/api/v1';

const USER_A = { email: 'amara.osei@nexus.test', password: 'BubbleTest2026!' }; // Nexus Analytics
const USER_B = { email: 'james.okafor@greenleaf.test', password: 'BubbleTest2026!' }; // GreenLeaf Capital (different org)

let tokenA = null, tokenB = null;
let userAId = null, userBId = null;
let convId = null;

const pass = (label) => console.log(`  ✅  ${label}`);
const fail = (label, det) => console.log(`  ❌  ${label}: ${det}`);
const section = (title) => console.log(`\n── ${title} ─────────────────────────`);

async function req(method, path, body, token) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let json = {};
    try { json = await res.json(); } catch { }
    return { status: res.status, json };
}

/* ── 1. Auth ─────────────────────────────────────────── */
async function testAuth() {
    section('1. AUTH');
    const { status: sA, json: jA } = await req('POST', '/auth/login', USER_A);
    if (sA === 200 && (jA.token || jA.data?.accessToken)) {
        tokenA = jA.token || jA.data?.accessToken;
        userAId = jA.user?._id || jA.user?.id || jA.data?.user?.id || jA.data?.user?._id;
        pass(`Login User A (${USER_A.email}) — uid: ${userAId}`);
    } else {
        fail('Login User A', JSON.stringify(jA).substring(0, 200));
        return false;
    }

    const { status: sB, json: jB } = await req('POST', '/auth/login', USER_B);
    if (sB === 200 && (jB.token || jB.data?.accessToken)) {
        tokenB = jB.token || jB.data?.accessToken;
        userBId = jB.user?._id || jB.user?.id || jB.data?.user?.id || jB.data?.user?._id;
        pass(`Login User B (${USER_B.email}) — uid: ${userBId}`);
    } else {
        fail('Login User B', JSON.stringify(jB).substring(0, 200));
        return false;
    }
    return true;
}

/* ── 2. User search & profile ────────────────────────── */
async function testUsers() {
    section('2. USER SEARCH & PROFILE');
    const { status: s1, json: j1 } = await req('GET', '/user/search?search=Amara', null, tokenA);
    if (s1 === 200 && j1.users) {
        pass(`Search "Amara" → ${j1.users.length} results`);
    } else {
        fail('User search', `${s1}`);
    }

    const { status: s2, json: j2 } = await req('GET', '/profile/me', null, tokenA);
    if (s2 === 200) {
        pass(`GET /profile/me → ${j2.data?.full_name || j2.full_name || 'ok'}`);
    } else {
        fail('GET /profile/me', `${s2} ${JSON.stringify(j2)}`);
    }
}

/* ── 3. Cross-org messaging governance ───────────────── */
async function testMessagingGovernance() {
    section('3. CROSS-ORG MESSAGING GOVERNANCE');
    if (!userBId) { fail('can-message', 'No userBId'); return; }

    const { status: s1, json: j1 } = await req('GET', `/message/can-message/${userBId}`, null, tokenA);
    if (s1 === 200) {
        if (j1.canMessage === false) {
            pass(`Can-message (cross-org) → correctly BLOCKED, reason: ${j1.reason}`);
        } else {
            pass(`Can-message → canMessage=${j1.canMessage} (request may exist already)`);
        }
    } else {
        fail('GET can-message', `${s1} ${JSON.stringify(j1)}`);
    }

    const { status: s2, json: j2 } = await req('GET', '/message/requests', null, tokenA);
    if (s2 === 200) {
        pass(`GET /message/requests → ${(j2.requests || []).length} pending`);
    } else {
        fail('GET pending requests', `${s2} ${JSON.stringify(j2)}`);
    }
}

/* ── 4. Same-org DM ─────────────────────────────────── */
async function testChat() {
    section('4. SAME-ORG DM CHAT');
    // Liam Thornton is also in Nexus Analytics (same org as Amara)
    const { status: su, json: ju } = await req('GET', '/user/search?search=Liam+Thornton', null, tokenA);
    const liamId = ju.users?.[0]?._id || ju.users?.[0]?.id;
    if (!liamId) { fail('Find Liam Thornton', `${su} users=${JSON.stringify(ju.users?.slice(0, 2))}`); return; }

    const { status: sc, json: jc } = await req('POST', '/chat', { userId: liamId }, tokenA);
    if (sc === 200 || sc === 201) {
        convId = jc.conversation?.id || jc.data?._id || jc._id;
        pass(`Create/access DM → convId: ${convId}`);
    } else {
        fail('POST /chat', `${sc} ${JSON.stringify(jc)}`);
        return;
    }

    const { status: sm, json: jm } = await req('GET', `/message/${convId}`, null, tokenA);
    if (sm === 200) {
        pass(`GET messages → ${(jm.messages || []).length} messages`);
    } else {
        fail('GET /message/:id', `${sm}`);
    }
}

/* ── 5. Aida conversation context (new endpoint) ─────── */
async function testAidaContext() {
    section('5. AIDA CONVERSATION CONTEXT (/aida/conversation-context/:id)');
    if (!convId) { fail('No convId', 'chat test must pass first'); return; }

    const { status, json } = await req('GET', `/aida/conversation-context/${convId}`, null, tokenA);
    if (status === 200) {
        pass(`Status 200 OK`);
        pass(`messageCount: ${json.messageCount}`);
        pass(`summary: ${json.summary ? json.summary.substring(0, 90) + '…' : '(none — no messages yet)'}`);
        const s = json.suggestions || [];
        pass(`suggestions (${s.length}): "${s[0]}" | "${s[1]}" | "${s[2]}"`);
        if (json.recipientContext) {
            pass(`recipientContext: ${json.recipientContext.name} — ${json.recipientContext.role} @ ${json.recipientContext.organization}`);
        }
    } else {
        fail('GET /aida/conversation-context', `${status} ${JSON.stringify(json)}`);
    }
}

/* ── 6. Aida chat ────────────────────────────────────── */
async function testAidaChat() {
    section('6. AIDA CHAT');
    const { status: s1, json: j1 } = await req('GET', '/aida/conversation', null, tokenA);
    if (s1 === 200) {
        pass(`GET /aida/conversation → ${j1.conversation?._id}`);
    } else {
        fail('GET /aida/conversation', `${s1}`);
        return;
    }

    const aidaConvId = j1.conversation?._id;
    if (aidaConvId) {
        const { status: s2, json: j2 } = await req('POST', '/aida/chat-message',
            { message: 'What can you help me with as a Software Engineer at a tech company?', conversationId: aidaConvId },
            tokenA
        );
        if (s2 === 200 && j2.botMessage) {
            pass(`POST /aida/chat-message → "${(j2.botMessage.content || '').substring(0, 80)}…"`);
        } else {
            fail('POST /aida/chat-message', `${s2} ${JSON.stringify(j2).substring(0, 200)}`);
        }
    }
}

/* ── 7. Feed & Stories ───────────────────────────────── */
async function testFeedAndStories() {
    section('7. FEED & STORIES');
    const { status: s1, json: j1 } = await req('GET', '/story', null, tokenA);
    s1 === 200 ? pass(`GET /story → ${(j1.stories || []).length} stories`) : fail('GET /story', `${s1}`);

    const { status: s2, json: j2 } = await req('GET', '/feed', null, tokenA);
    s2 === 200 ? pass(`GET /feed → ${(j2.posts || j2.data || []).length} posts`) : fail('GET /feed', `${s2}`);
}

/* ── Run ─────────────────────────────────────────────── */
(async () => {
    console.log('\n🧪 BUBBLE SPACE — ENDPOINT TEST SUITE');
    console.log(`   Backend: ${BASE}\n`);
    const authOk = await testAuth();
    if (!authOk) { console.log('\n🔴 Auth failed — aborting.\n'); process.exit(1); }
    await testUsers();
    await testMessagingGovernance();
    await testChat();
    await testAidaContext();
    await testAidaChat();
    await testFeedAndStories();
    console.log('\n\n✨ Test run complete.\n');
})();
