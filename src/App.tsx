import React, { useState, useEffect } from 'react';
import { Item, ItemType } from './types/item.types';
import { ItemCard } from './components/items/ItemCard';
import { ClaimModal } from './components/items/ClaimModal';
import { itemService } from './services/itemService';

export const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filterType, setFilterType] = useState<ItemType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  // Enterprise fallback mock items for instant local verification
  const defaultMockItems: Item[] = [
    {
      id: '1',
      title: 'Black Leather Wallet',
      category: 'WALLET',
      type: 'LOST',
      description: 'Lost near Central Bus Park. Contains college ID card and cash.',
      location: { latitude: 27.671, longitude: 85.391, addressText: 'Thimi Bus Stop, Bhaktapur' },
      dateLostOrFound: '2026-09-02T10:00:00Z',
      status: 'OPEN',
      hasSecretDetail: true,
      reportedByUserId: 'usr_101',
      createdAt: '2026-09-02T11:00:00Z',
    },
    {
      id: '2',
      title: 'Sony WH-1000XM4 Headphones',
      category: 'ELECTRONICS',
      type: 'FOUND',
      description: 'Found on the reading table in library 2nd floor.',
      location: { latitude: 27.717, longitude: 85.324, addressText: 'University Central Library' },
      dateLostOrFound: '2026-09-03T14:30:00Z',
      status: 'OPEN',
      hasSecretDetail: true,
      reportedByUserId: 'usr_202',
      createdAt: '2026-09-03T15:00:00Z',
    },
  ];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const typeQuery = filterType === 'ALL' ? undefined : filterType;
        const data = await itemService.getAllItems(typeQuery, searchQuery);
        setItems(data.length > 0 ? data : defaultMockItems);
      } catch (err) {
        console.warn('Backend unavailable, using local mock data.');
        setItems(defaultMockItems);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [filterType, searchQuery]);

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
      <div className="app-container">
        <header className="navbar">
          <div className="nav-brand">FindIt System</div>
          <div className="nav-actions">
            <button className="btn-primary">+ Report Item</button>
          </div>
        </header>

        <main className="content-container">
          <section className="search-controls">
            <input
                type="text"
                className="search-input"
                placeholder="Search items by name or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="filter-group">
              <button
                  className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterType('ALL')}
              >
                All Items
              </button>
              <button
                  className={`filter-btn ${filterType === 'LOST' ? 'active' : ''}`}
                  onClick={() => setFilterType('LOST')}
              >
                Lost
              </button>
              <button
                  className={`filter-btn ${filterType === 'FOUND' ? 'active' : ''}`}
                  onClick={() => setFilterType('FOUND')}
              >
                Found
              </button>
            </div>
          </section>

          {loading ? (
              <div className="loader">Loading reports...</div>
          ) : (
              <div className="items-grid">
                {filteredItems.map((item) => (
                    <ItemCard
                        key={item.id}
                        item={item}
                        onClaimClick={(it) => setSelectedItemForClaim(it)}
                    />
                ))}
              </div>
          )}

          {selectedItemForClaim && (
              <ClaimModal
                  item={selectedItemForClaim}
                  onClose={() => setSelectedItemForClaim(null)}
              />
          )}
        </main>
      </div>
  );
};

export default App;