import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { User } from '../types'
import './AdminPage.css'

type AdminCampaign = {
  id: number
  title: string
  active: boolean
  owner: Pick<User, 'id' | 'email' | 'first_name' | 'last_name'>
}

const displayName = (user: Pick<User, 'email' | 'first_name' | 'last_name'>) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

export function AdminPage({ currentUser }: { currentUser: User }) {
  const client = useQueryClient()
  const users = useQuery<User[]>({ queryKey: ['admin-users'], queryFn: () => api('/admin/users') })
  const campaigns = useQuery<AdminCampaign[]>({ queryKey: ['admin-campaigns'], queryFn: () => api('/admin/campaigns') })
  const [person, setPerson] = useState({ email: '', first_name: '', last_name: '', primary_affiliation: '' })
  const [editingUser, setEditingUser] = useState<Pick<User, 'id' | 'email' | 'first_name' | 'last_name' | 'primary_affiliation'> | null>(null)
  const adminCount = users.data?.filter((user) => user.is_system_admin).length || 0
  const createPerson = useMutation({
    mutationFn: () => api<User>('/admin/users', { method: 'POST', body: JSON.stringify(person) }),
    onSuccess: () => { setPerson({ email: '', first_name: '', last_name: '', primary_affiliation: '' }); client.invalidateQueries({ queryKey: ['admin-users'] }) },
  })
  const updateName = useMutation({
    mutationFn: () => api<User>(`/admin/users/${editingUser!.id}/profile`, { method: 'PUT', body: JSON.stringify({ first_name: editingUser!.first_name, last_name: editingUser!.last_name, primary_affiliation: editingUser!.primary_affiliation }) }),
    onSuccess: async (updated) => {
      if (updated.id === currentUser.id) client.setQueryData<User>(['me'], (current) => current ? { ...current, first_name: updated.first_name, last_name: updated.last_name, primary_affiliation: updated.primary_affiliation } : current)
      setEditingUser(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-users'] }), client.invalidateQueries({ queryKey: ['admin-campaigns'] })])
    },
  })
  const updateRoles = async (user: User, changes: Partial<Pick<User, 'is_system_admin' | 'organizer_approved'>>) => {
    await api(`/admin/users/${user.id}/roles`, { method: 'PUT', body: JSON.stringify({ is_system_admin: user.is_system_admin, organizer_approved: user.organizer_approved, ...changes }) })
    await client.invalidateQueries({ queryKey: ['admin-users'] })
  }
  const updateOwner = async (campaignId: number, userId: number) => {
    await api(`/admin/campaigns/${campaignId}/owner`, { method: 'PUT', body: JSON.stringify({ user_id: userId }) })
    await Promise.all([client.invalidateQueries({ queryKey: ['admin-campaigns'] }), client.invalidateQueries({ queryKey: ['admin-users'] }), client.invalidateQueries({ queryKey: ['campaigns'] })])
  }
  const deleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${displayName(user)} (${user.email})?\n\nAccounts connected to recruitment records cannot be deleted.`)) return
    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE' })
      await client.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete this user')
    }
  }
  const submit = (event: FormEvent) => { event.preventDefault(); createPerson.mutate() }
  return <section className="container page admin-page"><div className="page-heading"><div><div className="eyebrow">Portal administration</div><h1>People and roles</h1><p>Grant portal-wide privileges and choose the accountable owner of each recruitment campaign.</p></div></div><section className="panel admin-section"><div className="admin-section-heading"><div><h2>People</h2><p className="muted">Applicants, referees, and evaluators receive contextual access automatically. Only administrative roles are granted here.</p></div></div><form className="admin-person-form" onSubmit={submit}><label className="field">Email<input required type="email" placeholder="person@institution.org" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label><label className="field">First name<input placeholder="Given name" value={person.first_name} onChange={(event) => setPerson({ ...person, first_name: event.target.value })} /></label><label className="field">Last name<input placeholder="Family name" value={person.last_name} onChange={(event) => setPerson({ ...person, last_name: event.target.value })} /></label><label className="field">Primary affiliation<input maxLength={300} placeholder="Institution" value={person.primary_affiliation} onChange={(event) => setPerson({ ...person, primary_affiliation: event.target.value })} /></label><button className="button secondary" disabled={createPerson.isPending}>{createPerson.isPending ? 'Adding…' : 'Add person'}</button></form>{createPerson.error && <div className="notice error">{createPerson.error.message}</div>}{editingUser && <form className="admin-edit-form" onSubmit={(event) => { event.preventDefault(); updateName.mutate() }}><div><strong>Edit person</strong><small>{editingUser.email}</small></div><label className="field">First name<input required maxLength={120} value={editingUser.first_name} onChange={(event) => { setEditingUser({ ...editingUser, first_name: event.target.value }); updateName.reset() }} /></label><label className="field">Last name<input required maxLength={120} value={editingUser.last_name} onChange={(event) => { setEditingUser({ ...editingUser, last_name: event.target.value }); updateName.reset() }} /></label><label className="field">Primary affiliation<input maxLength={300} value={editingUser.primary_affiliation} onChange={(event) => { setEditingUser({ ...editingUser, primary_affiliation: event.target.value }); updateName.reset() }} /></label><div className="admin-edit-actions"><button className="button primary" disabled={updateName.isPending}>{updateName.isPending ? 'Saving…' : 'Save'}</button><button type="button" className="button ghost" onClick={() => setEditingUser(null)}>Cancel</button></div>{updateName.error && <div className="notice error">{updateName.error.message}</div>}</form>}<div className="role-table"><div className="role-row role-header"><span>Person</span><span>Primary affiliation</span><span>Organizer</span><span>Portal admin</span><span>Actions</span></div>{users.data?.map((user) => { const lastAdmin = user.is_system_admin && adminCount === 1; const cannotDelete = user.id === currentUser.id || lastAdmin; return <div className="role-row" key={user.id}><span><strong>{displayName(user)}</strong><small>{user.email}</small></span><span className="affiliation-cell" title={user.primary_affiliation || undefined}>{user.primary_affiliation || '—'}</span><label><input type="checkbox" checked={user.organizer_approved} disabled={user.is_system_admin} onChange={(event) => updateRoles(user, { organizer_approved: event.target.checked })} /> Organizer</label><label title={lastAdmin ? 'Assign another portal administrator before removing this role.' : undefined}><input type="checkbox" checked={user.is_system_admin} disabled={lastAdmin} onChange={(event) => updateRoles(user, { is_system_admin: event.target.checked })} /> Portal admin</label><span className="role-actions"><button type="button" className="edit-user" title={`Edit ${displayName(user)}`} aria-label={`Edit ${displayName(user)}`} onClick={() => { setEditingUser({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, primary_affiliation: user.primary_affiliation }); updateName.reset() }}><span aria-hidden="true">✎</span></button><button type="button" className="delete-user" disabled={cannotDelete} title={user.id === currentUser.id ? 'You cannot delete your own signed-in account.' : lastAdmin ? 'The last portal administrator cannot be deleted.' : `Delete ${displayName(user)}`} aria-label={`Delete ${displayName(user)}`} onClick={() => deleteUser(user)}>×</button></span></div>})}</div></section><section className="panel admin-section"><div className="admin-section-heading"><div><h2>Campaign owners</h2><p className="muted">An owner has full management responsibility for one campaign. Assigning ownership also grants organizer access.</p></div></div><div className="owner-list">{campaigns.data?.map((campaign) => <div className="owner-row" key={campaign.id}><div><strong>{campaign.title}</strong><small>{campaign.active ? 'Active campaign' : 'Inactive campaign'}</small></div><label>Owner<select value={campaign.owner.id} onChange={(event) => updateOwner(campaign.id, Number(event.target.value))}>{users.data?.map((user) => <option key={user.id} value={user.id}>{displayName(user)} — {user.email}</option>)}</select></label></div>)}</div></section></section>
}
