(() => {
    if (!window.lumaSupabase || !window.LumaData) return;
    const client = window.lumaSupabase;
    const isGuestMode = () => Boolean(window.LumaGuest?.isActive());
    const guestState = () => window.LumaGuest.getState();
    const updateGuestState = (updater) => window.LumaGuest.updateState(updater);

    const sessionContext = async ({ required = true } = {}) => {
        if (window.lumaAuthReady) await window.lumaAuthReady;
        const session = await window.LumaAuth.getSession();
        if (!session?.user && required) throw new Error('Authentication required.');
        return { session, user: session?.user || null };
    };

    const retryQuery = async (factory) => {
        let result = await factory();
        if (result.error?.code === 'PGRST303' && /issued at future/i.test(result.error.message || '')) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            result = await factory();
        }
        return result;
    };

    const loadLearningFacets = async () => {
        if (window.lumaAuthReady) await window.lumaAuthReady;
        const [careerResult, skillResult] = await Promise.all([
            retryQuery(() => client.from('career_paths').select('id,name,slug').order('name')),
            retryQuery(() => client.from('skills').select('id,name,slug').order('name'))
        ]);
        if (careerResult.error) throw careerResult.error;
        if (skillResult.error) throw skillResult.error;
        return { careers: careerResult.data || [], skills: skillResult.data || [] };
    };

    const loadLearningCatalog = async ({ mode = 'personalized', career = '', skill = '', concept = '', search = '' } = {}) => {
        const { user } = await sessionContext({ required: false });
        const guest = isGuestMode();
        const resourceSelect = user && !guest ? `
            id,title,description,concept,resource_type,minutes,url,difficulty,is_featured,
            resource_career_paths(career_paths(id,name,slug)),
            resource_skills(skills(id,name,slug)),
            user_resource_progress(status,completed_at)
        ` : `
            id,title,description,concept,resource_type,minutes,url,difficulty,is_featured,
            resource_career_paths(career_paths(id,name,slug)),
            resource_skills(skills(id,name,slug))
        `;
        const [resourceResult, profileResult] = await Promise.all([
            retryQuery(() => client.from('learning_resources').select(resourceSelect).eq('is_published', true).order('is_featured', { ascending: false }).order('title')),
            user && !guest
                ? retryQuery(() => client.from('profiles').select('active_career_name').eq('user_id', user.id).maybeSingle())
                : Promise.resolve({ data: guest ? { active_career_name: guestState().profile.active_career_name } : null, error: null })
        ]);
        if (resourceResult.error) throw resourceResult.error;
        if (profileResult.error) throw profileResult.error;
        const activeCareer = profileResult.data?.active_career_name || '';
        const targetCareer = career || (mode === 'personalized' ? activeCareer : '');
        const query = search.trim().toLowerCase();
        const resources = (resourceResult.data || []).filter((resource) => {
            const careers = resource.resource_career_paths.map((item) => item.career_paths).filter(Boolean);
            const skills = resource.resource_skills.map((item) => item.skills).filter(Boolean);
            const careerMatch = !targetCareer || careers.some((item) => item.slug === targetCareer || item.name === targetCareer);
            const skillMatch = !skill || skills.some((item) => item.slug === skill || item.name === skill);
            const conceptMatch = !concept || resource.concept === concept;
            const textMatch = !query || `${resource.title} ${resource.description} ${resource.concept}`.toLowerCase().includes(query);
            return careerMatch && skillMatch && conceptMatch && textMatch;
        }).map((resource) => ({
            ...resource,
            careers: resource.resource_career_paths.map((item) => item.career_paths).filter(Boolean),
            skills: resource.resource_skills.map((item) => item.skills).filter(Boolean),
            completed: guest
                ? guestState().progress.completedResourceIds.includes(resource.id)
                : (resource.user_resource_progress || []).some((item) => item.status === 'completed')
        }));
        return { resources, activeCareer };
    };

    const completeResource = async (resourceId) => {
        const progress = await window.LumaData.loadProgress() || {
            completedResourceIds: [], completedWeeklyTasks: [], completedProjects: 0,
            completedChallenges: 0, completedCertificates: 0, streak: 0, lastCompletedDate: null
        };
        if (!progress.completedResourceIds.includes(resourceId)) progress.completedResourceIds.push(resourceId);
        const today = new Date().toISOString().slice(0, 10);
        if (progress.lastCompletedDate !== today) progress.streak = Math.max(1, Number(progress.streak || 0) + 1);
        progress.lastCompletedDate = today;
        await window.LumaData.saveProgress(progress);
        localStorage.setItem('luma_progress_state', JSON.stringify(progress));
        return progress;
    };

    const loadRoadmapWithResources = async () => {
        if (isGuestMode()) {
            const state = guestState();
            const { resources } = await loadLearningCatalog({ mode: 'browse' });
            const completed = new Set(state.progress.completedResourceIds || []);
            const existingDays = state.roadmap?.roadmap_days || [];
            const roadmapDays = Array.from({ length: 7 }, (_, index) => {
                const resource = resources[index % Math.max(resources.length, 1)] || null;
                const existing = existingDays[index] || {};
                return {
                    id: existing.id || `guest-day-${index + 1}`,
                    day_number: index + 1,
                    title: existing.title || resource?.title || `Explore day ${index + 1}`,
                    objective: existing.objective || resource?.description || 'Explore a practical career concept.',
                    activity: existing.activity || '',
                    duration_minutes: existing.duration_minutes || resource?.minutes || 30,
                    status: resource && completed.has(resource.id) ? 'completed' : (existing.status || 'upcoming'),
                    roadmap_day_resources: resource ? [{
                        position: 1, is_required: true,
                        learning_resources: {
                            ...resource,
                            user_resource_progress: completed.has(resource.id) ? [{ status: 'completed', completed_at: new Date().toISOString() }] : []
                        }
                    }] : []
                };
            });
            const roadmap = {
                id: state.roadmap?.id || 'guest-roadmap',
                career_name: state.profile.active_career_name || 'UI/UX Designer',
                is_active: true,
                roadmap_days: roadmapDays
            };
            updateGuestState((next) => { next.roadmap = roadmap; return next; });
            return roadmap;
        }
        const { user } = await sessionContext();
        const { data, error } = await retryQuery(() => client.from('career_roadmaps').select(`
            id,career_name,is_active,created_at,
            roadmap_days(id,day_number,title,objective,activity,duration_minutes,status,
                roadmap_day_resources(position,is_required,
                    learning_resources(id,title,description,concept,resource_type,minutes,url,difficulty,
                        resource_skills(skills(id,name,slug)),
                        user_resource_progress(status,completed_at)
                    )
                )
            )
        `).eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle());
        if (error) throw error;
        if (data?.roadmap_days) data.roadmap_days.sort((a, b) => a.day_number - b.day_number);
        return data;
    };

    const loadDiscoveryFeed = async ({ search = '', community = '', career = '', skill = '', sort = 'newest' } = {}) => {
        const { user } = await sessionContext({ required: false });
        const guest = isGuestMode();
        const [postsResult, savesResult] = await Promise.all([
            retryQuery(() => client.from('discovery_posts').select('id,user_id,community_id,author_name,title,body,created_at,communities(id,name,slug,career_paths(id,name,slug),community_skills(skills(id,name,slug))),post_comments(count)').order('created_at', { ascending: false }).limit(50)),
            user && !guest
                ? retryQuery(() => client.from('saved_posts').select('post_id').eq('user_id', user.id))
                : Promise.resolve({ data: [], error: null })
        ]);
        if (postsResult.error) {
            throw postsResult.error;
        }
        if (savesResult.error) throw savesResult.error;
        const localState = guest ? guestState() : null;
        const saved = new Set(guest ? localState.savedPostIds : (savesResult.data || []).map((item) => item.post_id));
        const posts = [...(localState?.posts || []), ...(postsResult.data || [])].map((post) => ({
            ...post,
            is_saved: saved.has(post.id),
            comment_count: post.post_comments?.[0]?.count || 0,
            is_owner: Boolean(user && post.user_id === user.id)
        }));
        const needle = search.trim().toLowerCase();
        const filtered = posts.filter((post) => {
            const textMatch = !needle || `${post.title} ${post.body} ${post.author_name}`.toLowerCase().includes(needle);
            const communityMatch = !community || post.communities?.slug === community || post.community_id === community;
            const careerMatch = !career || post.communities?.career_paths?.slug === career;
            const skillMatch = !skill || (post.communities?.community_skills || []).some((item) => item.skills?.slug === skill);
            return textMatch && communityMatch && careerMatch && skillMatch;
        });
        if (sort === 'most-discussed') filtered.sort((a, b) => b.comment_count - a.comment_count || new Date(b.created_at) - new Date(a.created_at));
        return filtered;
    };

    const deletePost = async (postId) => {
        if (isGuestMode()) {
            updateGuestState((state) => {
                state.posts = state.posts.filter((post) => post.id !== postId);
                state.comments = state.comments.filter((comment) => comment.post_id !== postId);
                state.savedPostIds = state.savedPostIds.filter((id) => id !== postId);
                return state;
            });
            return;
        }
        const { user } = await sessionContext();
        const { error } = await client.from('discovery_posts').delete().eq('id', postId).eq('user_id', user.id);
        if (error) throw error;
    };

    const loadPostComments = async (postId) => {
        const { user } = await sessionContext({ required: false });
        const isDatabasePost = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(postId);
        const { data, error } = isDatabasePost
            ? await retryQuery(() => client.from('post_comments').select('*').eq('post_id', postId).order('created_at'))
            : { data: [], error: null };
        if (error) throw error;
        const localComments = isGuestMode() ? guestState().comments.filter((comment) => comment.post_id === postId) : [];
        return [...(data || []), ...localComments].map((comment) => ({ ...comment, is_owner: Boolean(user && comment.user_id === user.id) }));
    };

    const createPostComment = async ({ postId, body, parentCommentId = null }) => {
        if (isGuestMode()) {
            const comment = {
                id: `guest-comment-${crypto.randomUUID()}`, post_id: postId, user_id: window.LumaGuest.user.id,
                parent_comment_id: parentCommentId, author_name: 'Guest Reviewer', body,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            };
            updateGuestState((state) => { state.comments.push(comment); return state; });
            return comment;
        }
        const { user } = await sessionContext();
        const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Luma Learner';
        const { data, error } = await client.from('post_comments').insert({
            post_id: postId,
            user_id: user.id,
            parent_comment_id: parentCommentId,
            author_name: authorName,
            body
        }).select('*').single();
        if (error) throw error;
        return data;
    };

    const deletePostComment = async (commentId) => {
        if (isGuestMode()) {
            updateGuestState((state) => {
                state.comments = state.comments.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId);
                return state;
            });
            return;
        }
        const { user } = await sessionContext();
        const { error } = await client.from('post_comments').delete().eq('id', commentId).eq('user_id', user.id);
        if (error) throw error;
    };

    const loadCommunityWorkspace = async () => {
        const { user } = await sessionContext({ required: false });
        const guest = isGuestMode();
        const [communitiesResult, membershipsResult] = await Promise.all([
            retryQuery(() => client.from('communities').select('id,name,slug,description,member_count,career_paths(id,name,slug),community_skills(skills(id,name,slug))').order('name')),
            user && !guest
                ? retryQuery(() => client.from('community_memberships').select('community_id').eq('user_id', user.id))
                : Promise.resolve({ data: [], error: null })
        ]);
        if (communitiesResult.error) throw communitiesResult.error;
        if (membershipsResult.error) throw membershipsResult.error;
        const joinedIds = new Set((membershipsResult.data || []).map((item) => item.community_id));
        const joinedNames = new Set(guest ? guestState().joinedCommunityNames : []);
        return (communitiesResult.data || []).map((community) => ({ ...community, joined: guest ? joinedNames.has(community.name) : joinedIds.has(community.id) }));
    };

    const loadCommunityChannels = async (communityId) => {
        if (isGuestMode()) return [{ id: `guest-channel-${communityId}`, community_id: communityId, slug: 'general', name: 'general', position: 1, is_default: true }];
        await sessionContext();
        const { data, error } = await retryQuery(() => client.from('community_channels').select('*').eq('community_id', communityId).eq('is_default', true).order('position').limit(1));
        if (error) throw error;
        return data || [];
    };

    const loadCommunityMessages = async (channelId) => {
        if (isGuestMode()) return guestState().messages[channelId] || [];
        await sessionContext();
        const { data, error } = await retryQuery(() => client.from('community_messages').select('*').eq('channel_id', channelId).order('created_at', { ascending: false }).limit(100));
        if (error) throw error;
        return (data || []).reverse();
    };

    const sendCommunityMessage = async ({ channelId, communityId, body, replyToMessageId = null }) => {
        if (isGuestMode()) {
            const message = {
                id: `guest-message-${crypto.randomUUID()}`, channel_id: channelId, community_id: communityId,
                user_id: window.LumaGuest.user.id, reply_to_message_id: replyToMessageId,
                author_name: 'Guest Reviewer', body, created_at: new Date().toISOString()
            };
            updateGuestState((state) => {
                state.messages[channelId] = [...(state.messages[channelId] || []), message];
                return state;
            });
            return message;
        }
        const { user } = await sessionContext();
        const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Luma Learner';
        const { data, error } = await client.from('community_messages').insert({
            channel_id: channelId,
            community_id: communityId,
            user_id: user.id,
            reply_to_message_id: replyToMessageId,
            author_name: authorName,
            body
        }).select('*').single();
        if (error) throw error;
        return data;
    };

    const subscribeToTable = async ({ name, table, filter, callback, onStatus, required = true }) => {
        if (isGuestMode()) return null;
        const { session } = await sessionContext({ required });
        if (!session) return null;
        client.realtime.setAuth(session.access_token);
        return client.channel(`${name}:${crypto.randomUUID()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table, filter }, callback)
            .subscribe((status) => onStatus?.(status));
    };

    const subscribeCommunityRoom = async ({ channelId, onMessageChange, onPresence, onTyping, onStatus }) => {
        if (isGuestMode()) {
            const guestChannel = { guest: true, channelId, onMessageChange, onTyping };
            setTimeout(() => {
                onStatus?.('SUBSCRIBED');
                onPresence?.([{ user_id: window.LumaGuest.user.id, name: 'Guest Reviewer' }]);
            }, 0);
            return guestChannel;
        }
        const { session, user } = await sessionContext();
        client.realtime.setAuth(session.access_token);
        const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Luma Learner';
        const channel = client.channel(`community-room:${channelId}`, {
            config: { presence: { key: user.id }, broadcast: { self: false, ack: false } }
        });
        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channelId}` }, onMessageChange)
            .on('presence', { event: 'sync' }, () => {
                const members = Object.values(channel.presenceState()).flat();
                const uniqueMembers = [...new Map(members.map((member) => [member.user_id, member])).values()];
                onPresence?.(uniqueMembers);
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping?.(payload))
            .subscribe(async (status) => {
                onStatus?.(status);
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user.id, name: authorName, online_at: new Date().toISOString() });
                }
            });
        return channel;
    };

    const broadcastCommunityTyping = async (channel) => {
        if (!channel) return;
        if (isGuestMode()) return;
        const { user } = await sessionContext();
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Luma Learner';
        await channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, name, sent_at: Date.now() } });
    };

    const unsubscribeRealtime = async (channel) => {
        if (channel && !channel.guest) await client.removeChannel(channel);
    };

    Object.assign(window.LumaData, {
        loadLearningFacets,
        loadLearningCatalog,
        completeResource,
        loadRoadmapWithResources,
        loadDiscoveryFeed,
        deletePost,
        loadPostComments,
        createPostComment,
        deletePostComment,
        loadCommunityWorkspace,
        loadCommunityChannels,
        loadCommunityMessages,
        sendCommunityMessage,
        subscribeCommunityRoom,
        broadcastCommunityTyping,
        subscribeCommunityMessages: (channelId, callback, onStatus) => subscribeToTable({ name: 'community-messages', table: 'community_messages', filter: `channel_id=eq.${channelId}`, callback, onStatus }),
        subscribePostComments: (postId, callback) => subscribeToTable({ name: 'post-comments', table: 'post_comments', filter: `post_id=eq.${postId}`, callback }),
        subscribeDiscoveryPosts: (callback) => subscribeToTable({ name: 'discovery-posts', table: 'discovery_posts', callback, required: false }),
        unsubscribeRealtime
    });
})();