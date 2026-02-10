'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertCircle, Package, TrendingDown, Calendar, Plus, AlertTriangle, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface Drug {
  id: number;
  drug_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  dosage_form: string;
  strength: string;
  unit_price: string;
  reorder_level: number;
  current_stock: number;
  needs_reorder: boolean;
}

interface DrugBatch {
  id: number;
  drug: number;
  drug_name: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  supplier: string;
  is_expired: boolean;
  days_to_expiry: number;
}

interface StockTransaction {
  id: number;
  drug: number;
  drug_name: string;
  transaction_type: string;
  quantity: number;
  notes: string;
  created_at: string;
  created_by_name: string;
}

export default function PharmacyInventory() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [batches, setBatches] = useState<DrugBatch[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [activeTab, setActiveTab] = useState('drugs');

  const [drugForm, setDrugForm] = useState({
    drug_code: '', name: '', generic_name: '', manufacturer: '',
    dosage_form: 'tablet', strength: '', unit_price: '', reorder_level: ''
  });

  const [batchForm, setBatchForm] = useState({
    drug: '', batch_number: '', quantity: '', expiry_date: '',
    supplier: '', purchase_price: ''
  });

  const [transactionForm, setTransactionForm] = useState({
    drug: '', transaction_type: 'purchase', quantity: '', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drugsRes, batchesRes, transactionsRes] = await Promise.all([
        api.get('/pharmacy/drugs/'),
        api.get('/pharmacy/batches/'),
        api.get('/pharmacy/transactions/')
      ]);

      setDrugs(drugsRes.data.results || []);
      setBatches(batchesRes.data.results || []);
      setTransactions(transactionsRes.data.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrug = async () => {
    try {
      const response = await api.post('/pharmacy/drugs/', drugForm);

      if (response.status === 201 || response.status === 200) {
        setShowAddDrug(false);
        setDrugForm({ drug_code: '', name: '', generic_name: '', manufacturer: '', dosage_form: 'tablet', strength: '', unit_price: '', reorder_level: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding drug:', error);
    }
  };

  const handleAddBatch = async () => {
    try {
      const response = await api.post('/pharmacy/batches/', batchForm);

      if (response.status === 201 || response.status === 200) {
        setShowAddBatch(false);
        setBatchForm({ drug: '', batch_number: '', quantity: '', expiry_date: '', supplier: '', purchase_price: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding batch:', error);
    }
  };

  const handleTransaction = async () => {
    try {
      const response = await api.post('/pharmacy/transactions/', transactionForm);

      if (response.status === 201 || response.status === 200) {
        setShowTransaction(false);
        setTransactionForm({ drug: '', transaction_type: 'purchase', quantity: '', notes: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const filteredDrugs = drugs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.generic_name.toLowerCase().includes(search.toLowerCase()) ||
    d.drug_code.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockDrugs = drugs.filter(d => d.needs_reorder);
  const expiringBatches = batches.filter(b => !b.is_expired && b.days_to_expiry <= 90);
  const expiredBatches = batches.filter(b => b.is_expired);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="bg-gray-50 h-full">

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
        {lowStockDrugs.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lowStockDrugs.length} drug(s) need reordering</AlertDescription>
          </Alert>
        )}
        {expiringBatches.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{expiringBatches.length} batch(es) expiring within 90 days</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="drugs">Drugs ({drugs.length})</TabsTrigger>
            <TabsTrigger value="batches">Batches ({batches.length})</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="drugs" className="space-y-4">
            <div className="flex gap-4">
              <Input placeholder="Search drugs..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <Button onClick={() => setShowAddDrug(true)}><Plus className="w-4 h-4 mr-2" />Add Drug</Button>
              <Button variant="outline" onClick={() => setShowTransaction(true)}><Package className="w-4 h-4 mr-2" />Transaction</Button>
            </div>

            <div className="grid gap-4">
              {filteredDrugs.map(drug => (
                <Card key={drug.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{drug.name}</h3>
                        <Badge variant="outline">{drug.drug_code}</Badge>
                        {drug.needs_reorder && <Badge variant="destructive">Low Stock</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">{drug.generic_name}</p>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                        <div><span className="text-gray-600">Manufacturer:</span><p className="font-medium">{drug.manufacturer}</p></div>
                        <div><span className="text-gray-600">Form:</span><p className="font-medium">{drug.dosage_form}</p></div>
                        <div><span className="text-gray-600">Strength:</span><p className="font-medium">{drug.strength}</p></div>
                        <div><span className="text-gray-600">Price:</span><p className="font-medium">₹{drug.unit_price}</p></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{drug.current_stock}</div>
                      <div className="text-sm text-gray-600">In Stock</div>
                      <div className="text-xs text-gray-500 mt-1">Reorder at: {drug.reorder_level}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            <Button onClick={() => setShowAddBatch(true)}><Plus className="w-4 h-4 mr-2" />Add Batch</Button>
            <div className="grid gap-4">
              {batches.map(batch => (
                <Card key={batch.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{batch.drug_name}</h3>
                        <Badge variant="outline">{batch.batch_number}</Badge>
                        {batch.is_expired && <Badge variant="destructive">Expired</Badge>}
                        {!batch.is_expired && batch.days_to_expiry <= 90 && <Badge variant="secondary">Expiring Soon</Badge>}
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                        <div><span className="text-gray-600">Supplier:</span><p className="font-medium">{batch.supplier}</p></div>
                        <div><span className="text-gray-600">Quantity:</span><p className="font-medium">{batch.quantity}</p></div>
                        <div><span className="text-gray-600">Expiry:</span><p className="font-medium">{batch.expiry_date}</p></div>
                        <div><span className="text-gray-600">Days to Expiry:</span><p className="font-medium">{batch.days_to_expiry}</p></div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="grid gap-4">
              {transactions.map(txn => (
                <Card key={txn.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{txn.drug_name}</h3>
                        <Badge>{txn.transaction_type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{txn.notes}</p>
                      <div className="mt-2 text-xs text-gray-500">By {txn.created_by_name} on {new Date(txn.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{txn.quantity}</div>
                      <div className="text-sm text-gray-600">Units</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />Low Stock Alerts ({lowStockDrugs.length})
              </h3>
              <div className="space-y-2">
                {lowStockDrugs.map(drug => (
                  <div key={drug.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div><p className="font-medium">{drug.name}</p><p className="text-sm text-gray-600">{drug.drug_code}</p></div>
                    <div className="text-right"><p className="font-bold text-red-600">{drug.current_stock}</p><p className="text-xs text-gray-600">Reorder: {drug.reorder_level}</p></div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />Expiring Soon ({expiringBatches.length})
              </h3>
              <div className="space-y-2">
                {expiringBatches.map(batch => (
                  <div key={batch.id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <div><p className="font-medium">{batch.drug_name}</p><p className="text-sm text-gray-600">Batch: {batch.batch_number}</p></div>
                    <div className="text-right"><p className="font-bold text-orange-600">{batch.days_to_expiry} days</p><p className="text-xs text-gray-600">{batch.expiry_date}</p></div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddDrug} onOpenChange={setShowAddDrug}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add New Drug</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Drug Code</Label><Input value={drugForm.drug_code} onChange={(e) => setDrugForm({ ...drugForm, drug_code: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={drugForm.name} onChange={(e) => setDrugForm({ ...drugForm, name: e.target.value })} /></div>
            <div><Label>Generic Name</Label><Input value={drugForm.generic_name} onChange={(e) => setDrugForm({ ...drugForm, generic_name: e.target.value })} /></div>
            <div><Label>Manufacturer</Label><Input value={drugForm.manufacturer} onChange={(e) => setDrugForm({ ...drugForm, manufacturer: e.target.value })} /></div>
            <div><Label>Dosage Form</Label><select className="w-full border rounded p-2" value={drugForm.dosage_form} onChange={(e) => setDrugForm({ ...drugForm, dosage_form: e.target.value })}>
              <option value="tablet">Tablet</option><option value="capsule">Capsule</option><option value="syrup">Syrup</option><option value="injection">Injection</option><option value="cream">Cream</option>
            </select></div>
            <div><Label>Strength</Label><Input value={drugForm.strength} onChange={(e) => setDrugForm({ ...drugForm, strength: e.target.value })} /></div>
            <div><Label>Unit Price</Label><Input type="number" value={drugForm.unit_price} onChange={(e) => setDrugForm({ ...drugForm, unit_price: e.target.value })} /></div>
            <div><Label>Reorder Level</Label><Input type="number" value={drugForm.reorder_level} onChange={(e) => setDrugForm({ ...drugForm, reorder_level: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDrug(false)}>Cancel</Button>
            <Button onClick={handleAddDrug}>Add Drug</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddBatch} onOpenChange={setShowAddBatch}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Batch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Drug</Label><select className="w-full border rounded p-2" value={batchForm.drug} onChange={(e) => setBatchForm({ ...batchForm, drug: e.target.value })}>
              <option value="">Select Drug</option>{drugs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
            <div><Label>Batch Number</Label><Input value={batchForm.batch_number} onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={batchForm.supplier} onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })} /></div>
            <div><Label>Purchase Price</Label><Input type="number" value={batchForm.purchase_price} onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBatch(false)}>Cancel</Button>
            <Button onClick={handleAddBatch}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransaction} onOpenChange={setShowTransaction}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Drug</Label><select className="w-full border rounded p-2" value={transactionForm.drug} onChange={(e) => setTransactionForm({ ...transactionForm, drug: e.target.value })}>
              <option value="">Select Drug</option>{drugs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
            <div><Label>Transaction Type</Label><select className="w-full border rounded p-2" value={transactionForm.transaction_type} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_type: e.target.value })}>
              <option value="purchase">Purchase</option><option value="dispense">Dispense</option><option value="return">Return</option><option value="adjustment">Adjustment</option><option value="expired">Expired</option>
            </select></div>
            <div><Label>Quantity</Label><Input type="number" value={transactionForm.quantity} onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransaction(false)}>Cancel</Button>
            <Button onClick={handleTransaction}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
