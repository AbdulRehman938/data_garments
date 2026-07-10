import { useState, useEffect } from 'react';
import { FiSearch, FiPhone, FiMapPin, FiCheck, FiX } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  role: string | null;
  profile_pic_url: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => { fetchUsers(); }, [currentPage, itemsPerPage]);

  const fetchUsers = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('users').update({ is_verified: !currentStatus }).eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast(error.message || 'Failed to update user', 'error', 'Update Failed');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Users</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40" size={20} />
          <input type="text" placeholder="Search users by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20" />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-logo-rose/20">
        {isLoading ? (
          <div className="p-8 text-center text-logo-black/60">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{searchQuery ? 'No users found' : 'No users yet'}</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-silk-glow">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-logo-rose/10 hover:bg-logo-rose/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profile_pic_url ? (
                            <img src={user.profile_pic_url} alt={user.username} className="w-10 h-10 object-cover rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-bg-silk-glow rounded-full flex items-center justify-center">
                              <span className="text-logo-black/40 font-medium">{user.username.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-logo-black">{user.username}</p>
                            <p className="text-sm text-logo-black/60">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.phone && <div className="flex items-center gap-2 text-sm text-logo-black/60"><FiPhone size={14} />{user.phone}</div>}
                          {user.address && <div className="flex items-center gap-2 text-sm text-logo-black/60"><FiMapPin size={14} /><span className="truncate max-w-xs">{user.address}</span></div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-pop-orchid/20 text-pop-orchid' : 'bg-logo-rose/20 text-logo-rose'}`}>
                          {user.role || 'Customer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleToggleVerification(user.id, user.is_verified)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${user.is_verified ? 'bg-energy-apricot/20 text-energy-apricot hover:bg-energy-apricot/30' : 'bg-logo-rose/20 text-logo-rose hover:bg-logo-rose/30'}`}>
                          {user.is_verified ? <><FiCheck size={12} />Verified</> : <><FiX size={12} />Unverified</>}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-logo-black/60">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-logo-rose/10">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  {/* User Identity */}
                  <div className="flex items-center gap-3">
                    {user.profile_pic_url ? (
                      <img src={user.profile_pic_url} alt={user.username} className="w-10 h-10 object-cover rounded-full shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-bg-silk-glow rounded-full flex items-center justify-center shrink-0">
                        <span className="text-logo-black/40 font-medium">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-logo-black truncate">{user.username}</p>
                      <p className="text-xs text-logo-black/60 truncate">{user.email}</p>
                    </div>
                  </div>
                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-pop-orchid/20 text-pop-orchid' : 'bg-logo-rose/20 text-logo-rose'}`}>
                      {user.role || 'Customer'}
                    </span>
                    <button onClick={() => handleToggleVerification(user.id, user.is_verified)}
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${user.is_verified ? 'bg-energy-apricot/20 text-energy-apricot' : 'bg-logo-rose/20 text-logo-rose'}`}>
                      {user.is_verified ? <><FiCheck size={10} />Verified</> : <><FiX size={10} />Unverified</>}
                    </button>
                    <span className="text-xs text-logo-black/40">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  {/* Contact */}
                  {(user.phone || user.address) && (
                    <div className="space-y-0.5">
                      {user.phone && <div className="flex items-center gap-2 text-xs text-logo-black/60"><FiPhone size={12} />{user.phone}</div>}
                      {user.address && <div className="flex items-center gap-2 text-xs text-logo-black/60"><FiMapPin size={12} /><span className="truncate">{user.address}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-logo-rose/10">
                <p className="text-xs md:text-sm text-logo-black/60">Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                  <span className="px-3 py-1.5 text-sm font-medium text-logo-black">{currentPage} / {Math.ceil(totalCount / itemsPerPage)}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))} disabled={currentPage === Math.ceil(totalCount / itemsPerPage)} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
