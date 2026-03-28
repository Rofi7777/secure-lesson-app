window.App = window.App || {};
App.views = App.views || {};

App.views.admin = {

// Disabled: Supabase Edge Functions unavailable in internal mode
callAdminFunction: async function(action, payload) {
    if (payload === undefined) payload = {};
    console.log('Admin functions disabled in internal mode:', action);
    return { users: [] };
},

loadAdminData: async function() {
    var pendingContainer = document.getElementById('pending-users-container');
    var authorizedContainer = document.getElementById('authorized-users-container');
    var adminErrorMsg = document.getElementById('admin-error-message');
    var adminSuccessMsg = document.getElementById('admin-success-message');

    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    // Load pending users
    try {
        pendingContainer.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>載入中...</p></div>';
        var pendingResult = await this.callAdminFunction('get_pending_users');
        this.renderPendingUsers(pendingResult.users || []);
    } catch (error) {
        pendingContainer.innerHTML = '<div class="text-center text-red-300 py-8"><p>載入失敗: ' + error.message + '</p></div>';
    }

    // Load authorized users
    try {
        authorizedContainer.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>載入中...</p></div>';
        var authorizedResult = await this.callAdminFunction('get_authorized_users');
        this.renderAuthorizedUsers(authorizedResult.users || []);
    } catch (error) {
        authorizedContainer.innerHTML = '<div class="text-center text-red-300 py-8"><p>載入失敗: ' + error.message + '</p></div>';
    }
},

renderPendingUsers: function(users) {
    var container = document.getElementById('pending-users-container');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="text-center text-indigo-200 py-8"><p>目前沒有待審核的用戶</p></div>';
        return;
    }

    container.innerHTML = users.map(function(user) {
        var createdDate = new Date(user.created_at).toLocaleString('zh-TW');
        var lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-TW') : '從未登入';
        var safeEmail = user.email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<div class="bg-white/10 rounded-lg p-4 border border-white/20">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<p class="font-semibold text-lg">' + safeEmail + '</p>' +
            '<p class="text-sm text-indigo-200 mt-1">註冊時間: ' + createdDate + '</p>' +
            '<p class="text-sm text-indigo-200">最後登入: ' + lastSignIn + '</p>' +
            '</div>' +
            '<button class="admin-approve-btn ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium" data-user-id="' + user.id + '" data-email="' + safeEmail + '">' +
            '<i class="fas fa-check mr-2"></i>審核通過' +
            '</button></div></div>';
    }).join('');
    // Attach event listeners safely (no inline onclick)
    container.querySelectorAll('.admin-approve-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            App.views.admin.approveUser(btn.dataset.userId, btn.dataset.email);
        });
    });
},

renderAuthorizedUsers: function(users) {
    var container = document.getElementById('authorized-users-container');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="text-center text-indigo-200 py-8"><p>目前沒有已授權的用戶</p></div>';
        return;
    }

    container.innerHTML = users.map(function(user) {
        var createdDate = new Date(user.created_at).toLocaleString('zh-TW');
        var updatedDate = new Date(user.updated_at).toLocaleString('zh-TW');
        var safeEmail = (user.email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        var safeNotes = (user.notes || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        var statusBadge = user.is_active
            ? '<span class="px-2 py-1 bg-green-600 rounded text-xs">啟用</span>'
            : '<span class="px-2 py-1 bg-red-600 rounded text-xs">停用</span>';
        var btnClass = user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
        var btnIcon = user.is_active ? 'fa-ban' : 'fa-check';
        var btnLabel = user.is_active ? '停用' : '啟用';
        return '<div class="bg-white/10 rounded-lg p-4 border border-white/20">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<div class="flex items-center gap-2 mb-2">' +
            '<p class="font-semibold text-lg">' + safeEmail + '</p>' +
            statusBadge +
            '</div>' +
            '<p class="text-sm text-indigo-200">建立時間: ' + createdDate + '</p>' +
            '<p class="text-sm text-indigo-200">更新時間: ' + updatedDate + '</p>' +
            (user.notes ? '<p class="text-sm text-indigo-200 mt-1">備註: ' + safeNotes + '</p>' : '') +
            '</div>' +
            '<div class="ml-4 flex gap-2">' +
            '<button class="admin-status-btn px-4 py-2 ' + btnClass + ' rounded-lg text-sm font-medium" data-user-id="' + user.user_id + '" data-active="' + !user.is_active + '">' +
            '<i class="fas ' + btnIcon + ' mr-2"></i>' + btnLabel + '</button>' +
            '</div></div></div>';
    }).join('');
    container.querySelectorAll('.admin-status-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            App.views.admin.updateUserStatus(btn.dataset.userId, btn.dataset.active === 'true');
        });
    });
},

approveUser: async function(userId, email) {
    var adminErrorMsg = document.getElementById('admin-error-message');
    var adminSuccessMsg = document.getElementById('admin-success-message');

    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    try {
        await this.callAdminFunction('approve_user', { user_id: userId, email: email });
        adminSuccessMsg.textContent = '已成功審核通過 ' + email;
        adminSuccessMsg.classList.remove('hidden');
        this.loadAdminData();
    } catch (error) {
        adminErrorMsg.textContent = '審核失敗: ' + error.message;
        adminErrorMsg.classList.remove('hidden');
    }
},

updateUserStatus: async function(userId, isActive) {
    var adminErrorMsg = document.getElementById('admin-error-message');
    var adminSuccessMsg = document.getElementById('admin-success-message');

    if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
    if (adminSuccessMsg) adminSuccessMsg.classList.add('hidden');

    try {
        await this.callAdminFunction('update_user_status', { user_id: userId, is_active: isActive });
        adminSuccessMsg.textContent = '已成功' + (isActive ? '啟用' : '停用') + '用戶';
        adminSuccessMsg.classList.remove('hidden');
        this.loadAdminData();
    } catch (error) {
        adminErrorMsg.textContent = '更新失敗: ' + error.message;
        adminErrorMsg.classList.remove('hidden');
    }
}

};

