import './project-users.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import {
  addProjectMember,
  getProjectUsers,
  removeProjectMember,
  searchAppUsers
} from '../../services/project-members.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError, showSuccess } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

export async function render(params) {
  const html = await loadHtml(new URL('./project-users.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        currentUser: null,
        project: null,
        members: [],
        allUsers: [],
        removeUserId: null,
        removeUserEmail: ''
      };

      const projectTitle = document.querySelector('[data-project-title]');
      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-users-error]');
      const membersTableWrap = document.querySelector('[data-members-table-wrap]');
      const membersRows = document.querySelector('[data-members-rows]');
      const emptyState = document.querySelector('[data-empty-state]');
      const addUserBtn = document.querySelector('[data-add-user-btn]');
      const userSearchInput = document.querySelector('[data-user-search]');
      const allUsersRows = document.querySelector('[data-all-users-rows]');
      const addUserError = document.querySelector('[data-add-user-error]');
      const removeUserEmail = document.querySelector('[data-remove-user-email]');
      const confirmRemoveUserBtn = document.querySelector('[data-confirm-remove-user]');

      const addUserModal = new Modal(document.getElementById('addUserModal'));
      const removeUserModal = new Modal(document.getElementById('removeUserModal'));

      const escapeHtml = (value) =>
        String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      const showAddUserError = (message) => {
        setText(addUserError, message);
        setHidden(addUserError, !message);
      };

      const renderMembers = () => {
        if (!membersRows) {
          return;
        }

        if (!state.members.length) {
          membersRows.innerHTML = '';
          setHidden(membersTableWrap, true);
          setHidden(emptyState, false);
          return;
        }

        const canManage = state.project?.owner_id === state.currentUser?.id;

        membersRows.innerHTML = state.members
          .map((member) => {
            const role = member.is_owner ? 'Owner' : 'Member';
            const assigned = member.assigned_at ? new Date(member.assigned_at).toLocaleDateString() : '-';

            return `
              <tr>
                <td>${escapeHtml(member.email)}</td>
                <td class="member-role">${role}</td>
                <td>${assigned}</td>
                <td class="text-end">
                  ${canManage && !member.is_owner
                    ? `<button class="btn btn-sm btn-outline-danger" type="button" data-remove-user="${member.user_id}" data-remove-email="${escapeHtml(member.email)}">Remove</button>`
                    : ''}
                </td>
              </tr>
            `;
          })
          .join('');

        setHidden(membersTableWrap, false);
        setHidden(emptyState, true);
      };

      const renderAllUsers = () => {
        if (!allUsersRows) {
          return;
        }

        const assignedIds = new Set(state.members.map((member) => member.user_id));
        const searchText = String(userSearchInput?.value ?? '').trim().toLowerCase();

        const candidates = state.allUsers.filter((user) => {
          if (!user.email) {
            return false;
          }

          if (assignedIds.has(user.id)) {
            return false;
          }

          return !searchText || user.email.toLowerCase().includes(searchText);
        });

        if (!candidates.length) {
          allUsersRows.innerHTML = '<tr><td colspan="2" class="text-muted">No users match your search.</td></tr>';
          return;
        }

        allUsersRows.innerHTML = candidates
          .map(
            (user) => `
              <tr>
                <td>${escapeHtml(user.email)}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-accent" type="button" data-add-user="${user.id}">Add</button>
                </td>
              </tr>
            `
          )
          .join('');
      };

      const loadMembers = async () => {
        state.members = await getProjectUsers(params.id);
        renderMembers();
      };

      setHidden(authRequired, true);
      setHidden(membersTableWrap, true);
      setHidden(emptyState, true);
      showInlineError('');

      state.currentUser = await getCurrentUser();
      if (!state.currentUser) {
        setHidden(authRequired, false);
        return;
      }

      try {
        state.project = await getProject(params.id);
        setText(projectTitle, state.project.title ?? 'Project');

        const isOwner = state.project.owner_id === state.currentUser.id;
        setHidden(addUserBtn, !isOwner);

        await loadMembers();

        if (!isOwner) {
          showInlineError('Only project owners can manage members.');
          return;
        }

        state.allUsers = await searchAppUsers('');
        renderAllUsers();
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load project users.');
      }

      addUserBtn?.addEventListener('click', async () => {
        showAddUserError('');
        try {
          state.allUsers = await searchAppUsers(String(userSearchInput?.value ?? '').trim());
          renderAllUsers();
          addUserModal.show();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to load users.');
        }
      });

      userSearchInput?.addEventListener('input', () => {
        renderAllUsers();
      });

      allUsersRows?.addEventListener('click', async (event) => {
        const addButton = event.target.closest('[data-add-user]');
        if (!addButton) {
          return;
        }

        const userId = addButton.getAttribute('data-add-user');
        if (!userId) {
          return;
        }

        showAddUserError('');

        try {
          await addProjectMember(params.id, userId);
          await loadMembers();
          renderAllUsers();
          showSuccess('User added to project.');
        } catch (error) {
          showAddUserError(error?.message ?? 'Unable to add user.');
        }
      });

      membersRows?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-user]');
        if (!removeButton) {
          return;
        }

        state.removeUserId = removeButton.getAttribute('data-remove-user');
        state.removeUserEmail = removeButton.getAttribute('data-remove-email') ?? '';
        setText(removeUserEmail, state.removeUserEmail);
        removeUserModal.show();
      });

      confirmRemoveUserBtn?.addEventListener('click', async () => {
        if (!state.removeUserId) {
          return;
        }

        try {
          await removeProjectMember(params.id, state.removeUserId);
          state.removeUserId = null;
          state.removeUserEmail = '';
          removeUserModal.hide();
          await loadMembers();
          renderAllUsers();
          showSuccess('User removed from project.');
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to remove user.');
        }
      });
    }
  };
}
