document.addEventListener('DOMContentLoaded', async () => {
    if (!window.LumaData?.loadDiscoveryFeed) return;
    const feed = document.getElementById('discovery-feed-container');
    const commentModal = document.getElementById('discussion-comments-modal');
    const commentList = document.getElementById('discussion-comments-list');
    const commentForm = document.getElementById('discussion-comment-form');
    const commentInput = document.getElementById('discussion-comment-input');
    const replyLabel = document.getElementById('discussion-reply-label');
    const createModal = document.getElementById('discovery-create-post-modal');
    const createForm = document.getElementById('discovery-create-post-form');
    const communitySelect = document.getElementById('community-chat-community');
    const channelList = document.getElementById('community-channel-list');
    const messageList = document.getElementById('community-message-list');
    const messageForm = document.getElementById('community-message-form');
    const messageInput = document.getElementById('community-message-input');
    const chatStatus = document.getElementById('community-chat-status');
    const presenceStatus = document.getElementById('community-presence-status');
    const typingIndicator = document.getElementById('community-typing-indicator');
    let activePostId = null;
    let replyToCommentId = null;
    let activeCommunityId = null;
    let activeChannelId = null;
    let commentsChannel = null;
    let messagesChannel = null;
    let postsChannel = null;
    let communities = [];
    let typingClearTimer = null;
    let lastTypingBroadcast = 0;
    let filterTimer = null;

    const currentFilters = () => ({
        search: document.getElementById('community-search-input')?.value || '',
        community: document.getElementById('explorer-community-filter')?.value || '',
        career: document.getElementById('explorer-career-filter')?.value || '',
        skill: document.getElementById('explorer-skill-filter')?.value || '',
        sort: document.getElementById('explorer-sort-select')?.value || 'newest'
    });

    const initials = (name = 'Luma Learner') => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const relativeTime = (value) => {
        const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const renderPost = (post) => {
        const card = document.createElement('article');
        card.className = 'discussion-premium-card-item';
        card.dataset.postId = post.id;
        card.dataset.testid = `discovery-post-${post.id}`;

        const header = document.createElement('div');
        header.className = 'disc-header-row';
        const profile = document.createElement('div');
        profile.className = 'disc-user-profile-box';
        const avatar = document.createElement('div');
        avatar.className = 'disc-avatar-circle';
        avatar.style.cssText = 'display:grid;place-items:center;background:var(--color-primary);color:white;font-weight:800;';
        avatar.textContent = initials(post.author_name);
        const details = document.createElement('div');
        details.className = 'disc-user-details';
        const author = document.createElement('span');
        author.className = 'disc-user-name';
        author.textContent = post.author_name || 'Luma Learner';
        const meta = document.createElement('span');
        meta.className = 'disc-community-meta';
        meta.textContent = `posted in ${post.communities?.name || 'Luma'} • ${relativeTime(post.created_at)}`;
        details.append(author, meta);
        profile.append(avatar, details);
        header.appendChild(profile);
        if (post.is_owner) {
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'disc-stat-btn';
            edit.textContent = 'Edit';
            edit.dataset.testid = `discovery-edit-post-${post.id}`;
            edit.addEventListener('click', async () => {
                const title = window.prompt('Update the discussion title', post.title);
                if (title === null) return;
                const body = window.prompt('Update the discussion body', post.body);
                if (body === null || !title.trim() || !body.trim()) return;
                edit.disabled = true;
                try {
                    const updated = await window.LumaData.updatePost({ postId: post.id, title: title.trim(), body: body.trim() });
                    post.title = updated.title;
                    post.body = updated.body;
                    await refreshFeed();
                } catch (error) {
                    window.alert(error.message || 'This discussion could not be updated.');
                } finally {
                    edit.disabled = false;
                }
            });
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'disc-stat-btn';
            remove.textContent = 'Delete';
            remove.dataset.testid = `discovery-delete-post-${post.id}`;
            remove.addEventListener('click', async () => {
                if (!confirm('Delete this discussion?')) return;
                await window.LumaData.deletePost(post.id);
                await refreshFeed();
            });
            header.append(edit, remove);
        }

        const title = document.createElement('h3');
        title.className = 'disc-title-text';
        title.textContent = post.title;
        const body = document.createElement('p');
        body.className = 'disc-preview-body';
        body.textContent = post.body;
        const footer = document.createElement('div');
        footer.className = 'disc-footer-actions-row';
        const comments = document.createElement('button');
        comments.type = 'button';
        comments.className = 'disc-stat-btn';
        comments.textContent = `💬 ${post.comment_count} Comments`;
        comments.dataset.testid = `discovery-comments-${post.id}`;
        comments.addEventListener('click', () => openComments(post));
        const save = document.createElement('button');
        save.type = 'button';
        save.className = `disc-save-btn${post.is_saved ? ' is-saved' : ''}`;
        save.textContent = post.is_saved ? '🔖 Saved' : '🔖 Save';
        save.dataset.testid = `discovery-save-${post.id}`;
        save.addEventListener('click', async () => {
            save.disabled = true;
            try {
                await window.LumaData.toggleSavedPost(post.id, !post.is_saved);
                post.is_saved = !post.is_saved;
                save.textContent = post.is_saved ? '🔖 Saved' : '🔖 Save';
            } catch (error) {
                window.alert(error.message || 'Sign in to save discussions.');
            } finally {
                save.disabled = false;
            }
        });
        footer.append(comments, save);
        card.append(header, title, body, footer);
        return card;
    };

    const refreshFeed = async () => {
        const posts = await window.LumaData.loadDiscoveryFeed(currentFilters());
        feed.replaceChildren(...posts.map(renderPost));
        if (!posts.length) feed.textContent = 'No discussions yet. Start the first one.';
    };

    const renderComments = async () => {
        const comments = await window.LumaData.loadPostComments(activePostId);
        commentList.replaceChildren();
        const byParent = new Map();
        comments.filter((item) => item.parent_comment_id).forEach((item) => {
            if (!byParent.has(item.parent_comment_id)) byParent.set(item.parent_comment_id, []);
            byParent.get(item.parent_comment_id).push(item);
        });
        comments.filter((item) => !item.parent_comment_id).forEach((comment) => {
            commentList.appendChild(commentNode(comment, false));
            (byParent.get(comment.id) || []).forEach((reply) => commentList.appendChild(commentNode(reply, true)));
        });
        if (!comments.length) commentList.textContent = 'No comments yet. Add the first response.';
    };

    const commentNode = (comment, isReply) => {
        const item = document.createElement('div');
        item.className = `post-comment${isReply ? ' reply' : ''}`;
        item.dataset.testid = `post-comment-${comment.id}`;
        const author = document.createElement('strong');
        author.textContent = `${comment.author_name || 'Luma Learner'} • ${relativeTime(comment.created_at)}`;
        const body = document.createElement('p');
        body.textContent = comment.body;
        item.append(author, body);
        if (!isReply) {
            const actions = document.createElement('div');
            actions.className = 'post-comment-actions';
            const reply = document.createElement('button');
            reply.type = 'button';
            reply.textContent = 'Reply';
            reply.dataset.testid = `post-comment-reply-${comment.id}`;
            reply.addEventListener('click', () => {
                replyToCommentId = comment.id;
                replyLabel.textContent = `Replying to ${comment.author_name}`;
                replyLabel.hidden = false;
                commentInput.focus();
            });
            actions.appendChild(reply);
            item.appendChild(actions);
        }
        if (comment.is_owner) {
            const actions = item.querySelector('.post-comment-actions') || document.createElement('div');
            actions.className = 'post-comment-actions';
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = 'Delete';
            remove.dataset.testid = `post-comment-delete-${comment.id}`;
            remove.addEventListener('click', async () => {
                remove.disabled = true;
                try {
                    await window.LumaData.deletePostComment(comment.id);
                    await renderComments();
                    await refreshFeed();
                } catch (error) {
                    remove.disabled = false;
                    window.alert(error.message || 'This comment could not be deleted.');
                }
            });
            actions.appendChild(remove);
            if (!actions.parentElement) item.appendChild(actions);
        }
        return item;
    };

    const openComments = async (post) => {
        activePostId = post.id;
        replyToCommentId = null;
        replyLabel.hidden = true;
        document.getElementById('discussion-comments-title').textContent = post.title;
        commentModal.classList.add('active');
        await renderComments();
        await window.LumaData.unsubscribeRealtime(commentsChannel);
        commentsChannel = await window.LumaData.subscribePostComments(post.id, renderComments);
    };

    const renderMessages = (messages) => {
        messageList.replaceChildren();
        messages.forEach((message) => {
            const item = document.createElement('div');
            item.className = 'community-message';
            item.dataset.testid = `community-message-${message.id}`;
            const avatar = document.createElement('div');
            avatar.className = 'community-message-avatar';
            avatar.textContent = initials(message.author_name);
            const copy = document.createElement('div');
            const author = document.createElement('strong');
            author.textContent = `${message.author_name} • ${relativeTime(message.created_at)}`;
            const body = document.createElement('p');
            body.textContent = message.body;
            copy.append(author, body);
            item.append(avatar, copy);
            messageList.appendChild(item);
        });
        if (!messages.length) messageList.textContent = 'No messages yet. Say hello to the community.';
        messageList.scrollTop = messageList.scrollHeight;
    };

    const activateChannel = async (channelId) => {
        activeChannelId = channelId;
        document.querySelectorAll('.community-channel-button').forEach((button) => button.classList.toggle('active', button.dataset.channelId === channelId));
        renderMessages(await window.LumaData.loadCommunityMessages(channelId));
        await window.LumaData.unsubscribeRealtime(messagesChannel);
        clearTimeout(typingClearTimer);
        typingIndicator.hidden = true;
        typingIndicator.textContent = '';
        presenceStatus.textContent = 'Connecting…';
        messagesChannel = await window.LumaData.subscribeCommunityRoom({
            channelId,
            onMessageChange: async () => renderMessages(await window.LumaData.loadCommunityMessages(channelId)),
            onPresence: (members) => { presenceStatus.textContent = `${members.length} online`; },
            onTyping: (payload) => {
                typingIndicator.textContent = `${payload.name || 'Someone'} is typing…`;
                typingIndicator.hidden = false;
                clearTimeout(typingClearTimer);
                typingClearTimer = setTimeout(() => {
                    typingIndicator.hidden = true;
                    typingIndicator.textContent = '';
                }, 1800);
            },
            onStatus: (state) => { chatStatus.textContent = state === 'SUBSCRIBED' ? 'Live • messages update instantly' : 'Connecting to live chat…'; }
        });
    };

    const loadChannels = async (communityId) => {
        activeCommunityId = communityId;
        const channels = await window.LumaData.loadCommunityChannels(communityId);
        channelList.replaceChildren();
        channels.forEach((channel) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'community-channel-button';
            button.textContent = `# ${channel.name}`;
            button.dataset.channelId = channel.id;
            button.dataset.testid = `community-channel-${channel.slug}`;
            button.addEventListener('click', () => activateChannel(channel.id));
            channelList.appendChild(button);
        });
        if (channels[0]) await activateChannel(channels[0].id);
    };

    const refreshCommunities = async () => {
        communities = await window.LumaData.loadCommunityWorkspace();
        document.querySelectorAll('.comm-premium-card-redesigned').forEach((card) => {
            const name = card.querySelector('.comm-card-title')?.textContent.trim();
            const community = communities.find((item) => item.name === name);
            if (!community) return;
            card.dataset.communityId = community.id;
            card.dataset.communitySlug = community.slug;
            card.dataset.careerSlug = community.career_paths?.slug || '';
            card.dataset.skillSlugs = (community.community_skills || []).map((item) => item.skills?.slug).filter(Boolean).join(' ');
            const count = card.querySelector('.comm-member-count');
            if (count) count.textContent = `${community.member_count} Member${community.member_count === 1 ? '' : 's'}`;
            const join = card.querySelector('.comm-join-action-btn');
            join.dataset.testid = `community-${community.slug}-join-button`;
            join.className = `${community.joined ? 'btn-luma-joined' : 'btn-luma-primary'} comm-join-action-btn`;
            join.textContent = community.joined ? 'Joined ✓' : 'Join';
            join.onclick = async () => {
                try {
                    await window.LumaData.toggleCommunity(community.name, !community.joined);
                    await refreshCommunities();
                    await populateCommunitySelect();
                } catch (error) {
                    window.location.href = 'auth.html';
                }
            };
            const open = card.querySelector('.community-open-chat');
            if (open) {
                open.dataset.testid = `community-${community.slug}-open-chat`;
                open.onclick = () => openCommunityChat(community.id);
            }
        });
        document.querySelectorAll('.ai-rec-btn-action').forEach((button) => {
            button.onclick = async () => {
                try {
                    await window.LumaData.toggleCommunity(button.dataset.group, true);
                    button.className = 'btn-luma-joined ai-rec-btn-action';
                    button.textContent = 'Joined ✓';
                    await refreshCommunities();
                    await populateCommunitySelect();
                } catch (error) {
                    window.location.href = 'auth.html';
                }
            };
        });
    };

    const populateCommunitySelect = async () => {
        const joined = communities.filter((community) => community.joined);
        communitySelect.replaceChildren();
        joined.forEach((community) => communitySelect.add(new Option(community.name, community.id)));
        const createCommunity = document.getElementById('discovery-post-community');
        createCommunity.replaceChildren();
        communities.forEach((community) => createCommunity.add(new Option(community.name, community.name)));
        if (joined.length) {
            messageInput.disabled = false;
            await loadChannels(joined[0].id);
        } else {
            messageInput.disabled = true;
            channelList.textContent = 'Join a community to unlock channels.';
            messageList.textContent = 'Community chat is available to members.';
            chatStatus.textContent = 'Join a community above to start chatting.';
            presenceStatus.textContent = '0 online';
            typingIndicator.hidden = true;
        }
    };

    const openCommunityChat = async (communityId) => {
        const community = communities.find((item) => item.id === communityId);
        if (!community?.joined) {
            try {
                await window.LumaData.toggleCommunity(community.name, true);
                await refreshCommunities();
                await populateCommunitySelect();
            } catch (error) {
                window.location.href = 'auth.html';
                return;
            }
        }
        communitySelect.value = communityId;
        await loadChannels(communityId);
        document.getElementById('community-chat-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = commentInput.value.trim();
        if (!body) return;
        try {
            await window.LumaData.createPostComment({ postId: activePostId, body, parentCommentId: replyToCommentId });
            commentInput.value = '';
            replyToCommentId = null;
            replyLabel.hidden = true;
            await renderComments();
            await refreshFeed();
        } catch (error) {
            window.alert(error.message || 'Sign in to join the discussion.');
        }
    });

    messageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = messageInput.value.trim();
        if (!body || !activeChannelId || !activeCommunityId) return;
        try {
            messageInput.value = '';
            await window.LumaData.sendCommunityMessage({ channelId: activeChannelId, communityId: activeCommunityId, body });
            renderMessages(await window.LumaData.loadCommunityMessages(activeChannelId));
        } catch (error) {
            window.alert(error.message || 'Join this community to send messages.');
        }
    });
    messageInput.addEventListener('input', () => {
        if (!messageInput.value.trim() || !activeChannelId || !messagesChannel) return;
        const now = Date.now();
        if (now - lastTypingBroadcast < 700) return;
        lastTypingBroadcast = now;
        window.LumaData.broadcastCommunityTyping(messagesChannel).catch(() => {});
    });
    communitySelect.addEventListener('change', () => loadChannels(communitySelect.value));
    createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await window.LumaData.createPost({
                title: document.getElementById('discovery-post-title').value.trim(),
                body: document.getElementById('discovery-post-body').value.trim(),
                communityName: document.getElementById('discovery-post-community').value
            });
            createForm.reset();
            createModal.classList.remove('active');
            await refreshFeed();
        } catch (error) {
            window.alert(error.message || 'Sign in to publish a discussion.');
        }
    });

    document.getElementById('discovery-new-post-button').addEventListener('click', () => createModal.classList.add('active'));
    document.querySelectorAll('[data-close-discovery-modal]').forEach((button) => button.addEventListener('click', async () => {
        button.closest('.discovery-modal-overlay').classList.remove('active');
        if (button.closest('#discussion-comments-modal')) {
            await window.LumaData.unsubscribeRealtime(commentsChannel);
            commentsChannel = null;
        }
    }));
    document.getElementById('discussion-reply-cancel').addEventListener('click', () => {
        replyToCommentId = null;
        replyLabel.hidden = true;
    });

    const applyExplorerFilters = () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(async () => {
            const filters = currentFilters();
            document.querySelectorAll('.comm-premium-card-redesigned').forEach((item) => {
                const textMatch = !filters.search || item.textContent.toLowerCase().includes(filters.search.toLowerCase());
                const communityMatch = !filters.community || item.dataset.communitySlug === filters.community;
                const careerMatch = !filters.career || item.dataset.careerSlug === filters.career;
                const skillMatch = !filters.skill || (item.dataset.skillSlugs || '').split(' ').includes(filters.skill);
                item.style.display = textMatch && communityMatch && careerMatch && skillMatch ? '' : 'none';
            });
            await refreshFeed();
            window.dispatchEvent(new CustomEvent('lumaExplorerFiltersChanged', { detail: filters }));
        }, 180);
    };
    ['community-search-input','explorer-community-filter','explorer-career-filter','explorer-skill-filter','explorer-sort-select'].forEach((id) => {
        document.getElementById(id)?.addEventListener(id === 'community-search-input' ? 'input' : 'change', applyExplorerFilters);
    });

    try {
        await refreshCommunities();
        await populateCommunitySelect();
        await refreshFeed();
        postsChannel = await window.LumaData.subscribeDiscoveryPosts(refreshFeed);
    } catch (error) {
        chatStatus.textContent = 'Discovery Board could not be loaded.';
        console.error('Discovery Board initialization failed', error);
    }

    window.addEventListener('beforeunload', () => {
        clearTimeout(typingClearTimer);
        window.LumaData.unsubscribeRealtime(messagesChannel);
        window.LumaData.unsubscribeRealtime(commentsChannel);
        window.LumaData.unsubscribeRealtime(postsChannel);
    });
});