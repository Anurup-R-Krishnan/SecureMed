'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertCircle, Package, TrendingDown, Calendar, Plus, AlertTriangle, LogOut, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { toast } from 'sonner';

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
  stock_quantity: number;
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

      const normalize = (res: any) => (Array.isArray(res.data) ? res.data : (res.data?.results || []));
      setDrugs(normalize(drugsRes));
      setBatches(normalize(batchesRes));
      setTransactions(normalize(transactionsRes));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Unable to load pharmacy inventory data.');
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
        toast.success('Drug added.');
      }
    } catch (error) {
      console.error('Error adding drug:', error);
      toast.error('Failed to add drug.');
    }
  };

  const handleAddBatch = async () => {
    try {
      const response = await api.post('/pharmacy/batches/', batchForm);

      if (response.status === 201 || response.status === 200) {
        setShowAddBatch(false);
        setBatchForm({ drug: '', batch_number: '', quantity: '', expiry_date: '', supplier: '', purchase_price: '' });
        fetchData();
        toast.success('Batch added.');
      }
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Failed to add batch.');
    }
  };

  const handleTransaction = async () => {
    try {
      const response = await api.post('/pharmacy/transactions/', transactionForm);

      if (response.status === 201 || response.status === 200) {
        setShowTransaction(false);
        setTransactionForm({ drug: '', transaction_type: 'purchase', quantity: '', notes: '' });
        fetchData();
        toast.success('Transaction recorded.');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to record transaction.');
    }
  };

  const filteredDrugs = drugs.filter((d) => {
    const term = search.toLowerCase();
    return (
      String(d.name || '').toLowerCase().includes(term) ||
      String(d.generic_name || '').toLowerCase().includes(term) ||
      String(d.drug_code || '').toLowerCase().includes(term)
    );
  });

  const drugColumns: Column<Drug>[] = [
    {
      header: "Drug Details",
      cell: (drug) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-foreground transition-colors group-hover:text-primary">{drug.name}</div>
          <div className="text-xs text-muted-foreground">{drug.generic_name}</div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-md">{drug.drug_code}</Badge>
            {drug.needs_reorder && <Badge variant="destructive" className="text-[10px] h-5 px-1.5 rounded-md">Low Stock</Badge>}
          </div>
        </div>
      )
    },
    {
      header: "Manufacturer",
      accessorKey: "manufacturer",
      className: "font-medium"
    },
    {
      header: "Form & Strength",
      cell: (drug) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium capitalize">{drug.dosage_form}</div>
          <div className="text-xs text-muted-foreground">{drug.strength}</div>
        </div>
      )
    },
    {
      header: "Price",
      cell: (drug) => <span className="font-mono text-right w-full block">₹{drug.unit_price}</span>,
      className: "text-right"
    },
    {
      header: "Stock",
      cell: (drug) => (
        <div className="flex flex-col items-end gap-1">
          <div className="font-bold text-lg">{drug.stock_quantity}</div>
          <div className="text-[10px] text-muted-foreground">Reorder at {drug.reorder_level}</div>
        </div>
      ),
      className: "text-right"
    }
  ];

  const batchColumns: Column<Batch>[] = [
    {
      header: "Batch Info",
      cell: (batch) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold">{batch.drug_name}</div>
          <div className="text-xs font-mono text-muted-foreground">{batch.batch_number}</div>
        </div>
      )
    },
    {
      header: "Status",
      cell: (batch) => (
        batch.is_expired ? (
          <Badge variant="destructive" className="rounded-full">Expired</Badge>
        ) : batch.days_to_expiry <= 90 ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 rounded-full">Expiring Soon</Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 rounded-full">Valid</Badge>
        )
      )
    },
    {
      header: "Supplier",
      accessorKey: "supplier",
      className: "font-medium"
    },
    {
      header: "Expiry",
      cell: (batch) => (
        <div className="flex flex-col gap-1">
          <div>{batch.expiry_date}</div>
          <div className="text-xs text-muted-foreground">{batch.days_to_expiry} days left</div>
        </div>
      )
    },
    {
      header: "Quantity",
      accessorKey: "quantity",
      className: "text-right font-bold text-lg"
    }
  ];

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

          <TabsContent value="drugs" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search drugs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background" />
              </div>
              <Button onClick={() => setShowAddDrug(true)} className="rounded-xl shadow-lg shadow-primary/20"><Plus className="w-4 h-4 mr-2" />Add Drug</Button>
              <Button variant="outline" onClick={() => setShowTransaction(true)} className="rounded-xl"><Package className="w-4 h-4 mr-2" />Transaction</Button>
            </div>

            <div className="rounded-[24px] border border-border/60 overflow-hidden shadow-sm bg-card">
              <DataTable
                data={filteredDrugs}
                columns={drugColumns}
                keyExtractor={(d) => d.id}
              />
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddBatch(true)} className="rounded-xl shadow-lg shadow-primary/20"><Plus className="w-4 h-4 mr-2" />Add Batch</Button>
            </div>

            <div className="rounded-[24px] border border-border/60 overflow-hidden shadow-sm bg-card">
              <DataTable
                data={batches}
                columns={batchColumns}
                keyExtractor={(b) => b.id}
              />
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
                    <div className="text-right"><p className="font-bold text-red-600">{drug.stock_quantity}</p><p className="text-xs text-gray-600">Reorder: {drug.reorder_level}</p></div>
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
