window.App = window.App || {};
App.views = App.views || {};

App.views.admin = {

callAdminFunction: async function(action, payload) {
    if (payload === undefined) payload = {};
    console.log('Admin functions disabled in internal mode:', action);
    return { users: [] };
},

loadAdminData: async function() {
    const t = App.i18n.t;
    const pendingContainer = document.getElementById('pending-users-container');
    const authorizedContainer = document.getElementById('authorized-users-container');
    const adminErrorMsg = document.getElementById('admin-error-message');
    const adminSuccessMsg = document.getElementById('admin-success-message');

    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    try {
        pendingContainer.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>' + t('loading') + '</p></div>';
        const pendingResult = await this.callAdminFunction('get_pending_users');
        this.renderPendingUsers(pendingResult.users || []);
    } catch (error) {
        pendingContainer.textContent = t('loadFailed') + ': ' + error.message;
    }

    try {
        authorizedContainer.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>' + t('loading') + '</p></div>';
        const authorizedResult = await this.callAdminFunction('get_authorized_users');
        this.renderAuthorizedUsers(authorizedResult.users || []);
    } catch (error) {
        authorizedContainer.textContent = t('loadFailed') + ': ' + error.message;
    }
},

renderPendingUsers: function(users) {
    const t = App.i18n.t;
    const container = document.getElementById('pending-users-container');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="text-center text-indigo-200 py-8"><p>' + t('noPendingUsers') + '</p></div>';
        return;
    }

    const escHtml = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    container.innerHTML = users.map(user => {
        const createdDate = new Date(user.created_at).toLocaleString();
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : t('neverLoggedIn');
        const safeEmail = escHtml(user.email);
        return '<div class="bg-white/10 rounded-lg p-4 border border-white/20">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<p class="font-semibold text-lg">' + safeEmail + '</p>' +
            '<p class="text-sm text-indigo-200 mt-1">' + t('registeredAt') + ': ' + createdDate + '</p>' +
            '<p class="text-sm text-indigo-200">' + t('lastLogin') + ': ' + lastSignIn + '</p>' +
            '</div>' +
            '<button class="admin-approve-btn ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium" data-user-id="' + user.id + '" data-email="' + safeEmail + '">' +
            '<i class="fas fa-check mr-2"></i>' + t('approve') +
            '</button></div></div>';
    }).join('');
    container.querySelectorAll('.admin-approve-btn').forEach(btn => {
        btn.addEventListener('click', () => App.views.admin.approveUser(btn.dataset.userId, btn.dataset.email));
    });
},

renderAuthorizedUsers: function(users) {
    const t = App.i18n.t;
    const container = document.getElementById('authorized-users-container');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="text-center text-indigo-200 py-8"><p>' + t('noAuthorizedUsers') + '</p></div>';
        return;
    }

    const escHtml = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    container.innerHTML = users.map(user => {
        const createdDate = new Date(user.created_at).toLocaleString();
        const updatedDate = new Date(user.updated_at).toLocaleString();
        const safeEmail = escHtml(user.email);
        const safeNotes = escHtml(user.notes);
        const statusBadge = user.is_active
            ? '<span class="px-2 py-1 bg-green-600 rounded text-xs">' + t('enabled') + '</span>'
            : '<span class="px-2 py-1 bg-red-600 rounded text-xs">' + t('disabled') + '</span>';
        const btnClass = user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
        const btnIcon = user.is_active ? 'fa-ban' : 'fa-check';
        const btnLabel = user.is_active ? t('disable') : t('enable');
        return '<div class="bg-white/10 rounded-lg p-4 border border-white/20">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<div class="flex items-center gap-2 mb-2">' +
            '<p class="font-semibold text-lg">' + safeEmail + '</p>' +
            statusBadge +
            '</div>' +
            '<p class="text-sm text-indigo-200">' + t('createdAt') + ': ' + createdDate + '</p>' +
            '<p class="text-sm text-indigo-200">' + t('updatedAt') + ': ' + updatedDate + '</p>' +
            (user.notes ? '<p class="text-sm text-indigo-200 mt-1">' + t('notes') + ': ' + safeNotes + '</p>' : '') +
            '</div>' +
            '<div class="ml-4 flex gap-2">' +
            '<button class="admin-status-btn px-4 py-2 ' + btnClass + ' rounded-lg text-sm font-medium" data-user-id="' + user.user_id + '" data-active="' + !user.is_active + '">' +
            '<i class="fas ' + btnIcon + ' mr-2"></i>' + btnLabel + '</button>' +
            '</div></div></div>';
    }).join('');
    container.querySelectorAll('.admin-status-btn').forEach(btn => {
        btn.addEventListener('click', () => App.views.admin.updateUserStatus(btn.dataset.userId, btn.dataset.active === 'true'));
    });
},

approveUser: async function(userId, email) {
    const t = App.i18n.t;
    const adminErrorMsg = document.getElementById('admin-error-message');
    const adminSuccessMsg = document.getElementById('admin-success-message');
    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    try {
        await this.callAdminFunction('approve_user', { user_id: userId, email: email });
        adminSuccessMsg.textContent = t('approved') + ' ' + email;
        adminSuccessMsg.classList.remove('hidden');
        this.loadAdminData();
    } catch (error) {
        adminErrorMsg.textContent = t('approveFailed') + ': ' + error.message;
        adminErrorMsg.classList.remove('hidden');
    }
},

updateUserStatus: async function(userId, isActive) {
    const t = App.i18n.t;
    const adminErrorMsg = document.getElementById('admin-error-message');
    const adminSuccessMsg = document.getElementById('admin-success-message');
    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    try {
        await this.callAdminFunction('update_user_status', { user_id: userId, is_active: isActive });
        adminSuccessMsg.textContent = t('updateSuccess');
        adminSuccessMsg.classList.remove('hidden');
        this.loadAdminData();
    } catch (error) {
        adminErrorMsg.textContent = t('updateFailed') + ': ' + error.message;
        adminErrorMsg.classList.remove('hidden');
    }
}

};
