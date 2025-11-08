import React, { useEffect, useState } from 'react';
import { client } from '../appwrite';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const res = await client.listUsers(); // Appwrite admin SDK required
      setUsers(res.users);
    }
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await client.deleteUser(id);
    setUsers(users.filter(u => u.$id !== id));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Manage Users</h1>
      {users.map(u => (
        <div key={u.$id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
          <p>{u.name || u.email}</p>
          <button onClick={() => handleDelete(u.$id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
