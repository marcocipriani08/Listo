import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './error-handler';
import { ShoppingItem, ShoppingHistory, UserProfile, Family, guessCategory } from '../types';

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}`));
    return () => unsubscribe();
  }, [userId]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  return { profile, loading, updateProfile };
}

export function useShoppingList(familyId: string | undefined) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'families', familyId, 'items'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `families/${familyId}/items`));
    return () => unsubscribe();
  }, [familyId]);

  return { items, loading };
}

export function useJoinedFamilies(familyIds: string[] | undefined) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyIds || familyIds.length === 0) {
      setFamilies([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubs: (() => void)[] = [];
    const familiesMap = new Map<string, Family>();
    let loadedCount = 0;
    
    familyIds.forEach(id => {
      const unsub = onSnapshot(doc(db, 'families', id), (docSnap) => {
        if (docSnap.exists()) {
          familiesMap.set(id, { id: docSnap.id, ...docSnap.data() } as Family);
        } else {
          familiesMap.delete(id);
        }
        loadedCount++;
        // Update families state to reflect map values
        const currentFamilies = familyIds.map(fid => familiesMap.get(fid)).filter(Boolean) as Family[];
        setFamilies(currentFamilies);
        if (loadedCount >= familyIds.length) {
            setLoading(false);
        }
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [JSON.stringify(familyIds)]);

  return { families, loading };
}

export function useFamily(familyId: string | undefined): Family | null {
  const [family, setFamily] = useState<Family | null>(null);

  useEffect(() => {
    if (!familyId) {
      setFamily(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'families', familyId), (docSnap) => {
      if (docSnap.exists()) {
        setFamily({ id: docSnap.id, ...docSnap.data() } as Family);
      } else {
        setFamily(null);
      }
    });
    return unsub;
  }, [familyId]);

  return family;
}

export function useShoppingHistory(familyId: string | undefined) {
    const [history, setHistory] = useState<ShoppingHistory[]>([]);

    useEffect(() => {
    if (!familyId) {
      setHistory([]);
      return;
    }
    const q = query(
      collection(db, 'families', familyId, 'history'),
      orderBy('count', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingHistory)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `families/${familyId}/history`));
    return () => unsubscribe();
  }, [familyId]);

  return history;
}

export async function addShoppingItem(familyId: string, title: string, userId: string) {
  try {
    const categoryId = guessCategory(title);
    const itemId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10));
    
    // Create Item
    await setDoc(doc(db, 'families', familyId, 'items', itemId), {
      title: title.trim(),
      categoryId,
      quantity: 1,
      completed: false,
      addedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update History
    const historyId = title.trim().toLowerCase().replace(/\s+/g, '-');
    const historyRef = doc(db, 'families', familyId, 'history', historyId);
    const historySnap = await getDoc(historyRef);
    if (historySnap.exists()) {
      await updateDoc(historyRef, {
        count: (historySnap.data().count || 0) + 1,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(historyRef, {
        title: title.trim(),
        categoryId,
        count: 1,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `families/${familyId}/items OR history`);
  }
}

export async function updateItemQuantity(familyId: string, itemId: string, quantity: number) {
  try {
    if (quantity <= 0) {
      await deleteDoc(doc(db, 'families', familyId, 'items', itemId));
    } else {
      await updateDoc(doc(db, 'families', familyId, 'items', itemId), { quantity, updatedAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `families/${familyId}/items/${itemId}`);
  }
}

export async function toggleItemCompleted(familyId: string, itemId: string, completed: boolean) {
  try {
    await updateDoc(doc(db, 'families', familyId, 'items', itemId), { completed, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `families/${familyId}/items/${itemId}`);
  }
}

export async function clearCompletedItems(familyId: string, itemIds: string[]) {
  try {
    const batch = writeBatch(db);
    itemIds.forEach(id => {
       const ref = doc(db, 'families', familyId, 'items', id);
       batch.delete(ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `families/${familyId}/items`);
  }
}

export async function createFamily(userId: string, familyName: string, password?: string) {
  try {
    const familyId = Math.random().toString(36).substring(2, 8).toLowerCase();
    
    const familyData: any = {
      name: familyName,
      ownerId: userId,
      createdAt: serverTimestamp()
    };
    if (password) {
      familyData.password = password;
    }
    await setDoc(doc(db, 'families', familyId), familyData);
    
    // Create user profile if it doesn't exist
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: auth.currentUser?.email || '',
        familyId,
        joinedFamilies: [familyId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const data = userSnap.data();
      const joinedFamilies = Array.from(new Set([...(data.joinedFamilies || []), familyId]));
      await updateDoc(userRef, { familyId, joinedFamilies, updatedAt: serverTimestamp() });
    }
    return familyId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `families`);
    throw error;
  }
}

export async function joinFamily(userId: string, familyId: string, password?: string) {
  try {
    const familySnap = await getDoc(doc(db, 'families', familyId));
    if (!familySnap.exists()) {
      throw new Error("Famiglia non trovata. Controlla il codice.");
    }
    const familyData = familySnap.data();
    if (familyData.password && familyData.password !== password) {
      throw new Error("Password errata.");
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: auth.currentUser?.email || '',
        familyId,
        joinedFamilies: [familyId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const data = userSnap.data();
      const joinedFamilies = Array.from(new Set([...(data.joinedFamilies || []), familyId]));
      await updateDoc(userRef, { familyId, joinedFamilies, updatedAt: serverTimestamp() });
    }
    return true;
  } catch (error: any) {
    if (error.message.includes('non trovata') || error.message.includes('errata')) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

export async function getFamilies(familyIds: string[]): Promise<Family[]> {
    if (!familyIds || familyIds.length === 0) return [];
    try {
        const families: Family[] = [];
        // Due to firestore 'in' limits (max 10), we can just fetch them individually or use chunks
        for (const id of familyIds) {
           const snap = await getDoc(doc(db, 'families', id));
           if (snap.exists()) {
               families.push({ id: snap.id, ...snap.data() } as Family);
           }
        }
        return families;
    } catch(error) {
        console.error("Error fetching families", error);
        return [];
    }
}

export async function updateFamily(familyId: string, name: string) {
  try {
    await updateDoc(doc(db, 'families', familyId), { name, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `families/${familyId}`);
    throw error;
  }
}

export async function leaveFamily(userId: string, familyId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const joinedFamilies = (data.joinedFamilies || []).filter((id: string) => id !== familyId);
      const updateData: any = { joinedFamilies, updatedAt: serverTimestamp() };
      if (data.familyId === familyId) {
         updateData.familyId = joinedFamilies.length > 0 ? joinedFamilies[0] : null;
      }
      await updateDoc(userRef, updateData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

export async function deleteFamily(userId: string, familyId: string) {
  try {
    // 1. Fetch and delete items in the family
    const itemsSnapshot = await getDocs(collection(db, 'families', familyId, 'items'));
    const itemsBatch = writeBatch(db);
    itemsSnapshot.forEach((doc) => {
      itemsBatch.delete(doc.ref);
    });
    if (itemsSnapshot.size > 0) {
      await itemsBatch.commit();
    }

    // 2. Fetch and delete history in the family
    const historySnapshot = await getDocs(collection(db, 'families', familyId, 'history'));
    const historyBatch = writeBatch(db);
    historySnapshot.forEach((doc) => {
      historyBatch.delete(doc.ref);
    });
    if (historySnapshot.size > 0) {
      await historyBatch.commit();
    }

    // 3. Delete the family document itself
    const famRef = doc(db, 'families', familyId);
    await deleteDoc(famRef);
    
    // Attempt to leave/remove reference for owner too
    await leaveFamily(userId, familyId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `families/${familyId}`);
    throw error;
  }
}
