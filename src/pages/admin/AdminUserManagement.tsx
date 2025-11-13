
import React, { useState } from 'react';
import { useUsers } from '@/context/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const AdminUserManagement: React.FC = () => {
  const { users } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  
  // Filter users based on search query and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = 
      filterRole === null || 
      user.role === filterRole;
      
    return matchesSearch && matchesRole;
  });
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterRole(null);
  };
  
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600">View and manage all users in the system</p>
      </header>
      
      {/* Filters */}
      <div className="bg-card dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={filterRole === 'student' ? 'default' : 'outline'}
              onClick={() => setFilterRole(filterRole === 'student' ? null : 'student')}
            >
              Students
            </Button>
            <Button 
              variant={filterRole === 'organizer' ? 'default' : 'outline'}
              onClick={() => setFilterRole(filterRole === 'organizer' ? null : 'organizer')}
            >
              Organizers
            </Button>
            <Button 
              variant={filterRole === 'admin' ? 'default' : 'outline'}
              onClick={() => setFilterRole(filterRole === 'admin' ? null : 'admin')}
            >
              Admins
            </Button>
          </div>
          
          {(searchQuery || filterRole) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      
      {/* Results */}
      <div className="space-y-4">
        <div className="text-sm text-gray-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </div>
        
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No users found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card dark:bg-gray-800 divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        user.role === 'admin' ? 'default' : 
                        user.role === 'organizer' ? 'secondary' : 
                        'outline'
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'organizer' && (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {user.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      )}
                      {user.role !== 'organizer' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
