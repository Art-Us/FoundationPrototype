import { AlertMapItem, NeededResourceItem, AlertPostItem, PostChatMessage, ResourceAllocationRecord } from '../components/AlertsMap';
import { User, Organization, Municipality } from '../types';
import { MockDatabase, MockResource, MockAuditLog, getInitialMockDatabase } from './mockData';

const STORAGE_KEY = 'prototypq_standalone_db_v6';

class MockStorageService {
  private db: MockDatabase;

  constructor() {
    this.db = this.loadDatabase();
  }

  private loadDatabase(): MockDatabase {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as MockDatabase;
        if (
          Array.isArray(parsed.alerts) &&
          parsed.alerts.length > 0 &&
          Array.isArray(parsed.resources) &&
          parsed.resources.length > 0 &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.organizations)
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse mock database from localStorage, initializing default seed:', e);
    }
    const initial = getInitialMockDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  private saveDatabase(data: MockDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.db = data;
    } catch (e) {
      console.error('Failed to save mock database to localStorage:', e);
    }
  }

  private persist() {
    this.saveDatabase(this.db);
  }

  public resetToDefault(): MockDatabase {
    const initial = getInitialMockDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  // --- CURRENT USER HELPER ---
  public getCurrentUser(): User | null {
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u) as User;
    } catch (e) {}
    return this.db.users[0] || null;
  }

  // --- AUDIT LOG HELPER ---
  public addAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    details: string,
    previousState?: any,
    newState?: any,
    alertId?: string | null,
    alertTitle?: string | null
  ) {
    const currentUser = this.getCurrentUser();
    const log: MockAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      action,
      entityType,
      entityId,
      userId: currentUser?.id || 'usr-admin',
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrator',
      userEmail: currentUser?.email || 'admin@fundacjaq.pl',
      organizationId: currentUser?.organizationId || 'org-3',
      organizationName: currentUser?.organization?.name || 'Fundacja Q',
      alertId: alertId || (entityType === 'alert' ? entityId : undefined),
      alertTitle: alertTitle || (entityType === 'alert' ? newState?.title || previousState?.title : undefined),
      details,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
      newState: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
      isReverted: false,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(this.db.auditLogs)) {
      this.db.auditLogs = [];
    }
    this.db.auditLogs.unshift(log);
    this.persist();
  }

  // --- ALERTS CRUD ---
  public getAlerts(): AlertMapItem[] {
    return this.db.alerts.map((a) => {
      const muni = this.db.municipalities.find((m) => m.id === a.municipalityId);
      const author = this.db.users.find((u) => u.id === a.authorId);
      return {
        ...a,
        municipality: muni || a.municipality,
        author: author
          ? {
              id: author.id,
              firstName: author.firstName,
              lastName: author.lastName,
              role: author.role,
              organization: author.organization
                ? {
                    id: author.organization.id,
                    name: author.organization.name,
                    type: author.organization.type,
                  }
                : undefined,
            }
          : a.author,
      };
    });
  }

  public getAlertById(id: string): AlertMapItem | null {
    const alert = this.db.alerts.find((a) => a.id === id);
    if (!alert) return null;
    const muni = this.db.municipalities.find((m) => m.id === alert.municipalityId);
    const author = this.db.users.find((u) => u.id === alert.authorId);
    return {
      ...alert,
      municipality: muni || alert.municipality,
      author: author
        ? {
            id: author.id,
            firstName: author.firstName,
            lastName: author.lastName,
            role: author.role,
            organization: author.organization
              ? {
                  id: author.organization.id,
                  name: author.organization.name,
                  type: author.organization.type,
                }
              : undefined,
          }
        : alert.author,
    };
  }

  public createAlert(data: Partial<AlertMapItem>): AlertMapItem {
    const currentUser = this.getCurrentUser();
    const id = 'alt-' + Date.now();
    const muniId = data.municipalityId || currentUser?.organization?.municipalityId || 'muni-1';
    const muni = this.db.municipalities.find((m) => m.id === muniId);

    const newAlert: AlertMapItem = {
      id,
      title: data.title || 'Nowy Alert Kryzysowy',
      content: data.content || '',
      category: data.category || 'Ostrzeżenie hydrologiczne',
      severity: data.severity || 'wysoki',
      isActive: true,
      authorId: currentUser?.id || 'usr-admin',
      municipalityId: muniId,
      locationName: data.locationName || (muni ? muni.name : 'Nowa Dęba'),
      county: data.county || 'powiat tarnobrzeski',
      voivodeship: data.voivodeship || 'podkarpackie',
      lat: data.lat || 50.4261,
      lng: data.lng || 21.7505,
      createdAt: new Date().toISOString(),
      author: currentUser
        ? {
            id: currentUser.id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            role: currentUser.role,
            organization: currentUser.organization
              ? {
                  id: currentUser.organization.id,
                  name: currentUser.organization.name,
                  type: currentUser.organization.type,
                }
              : undefined,
          }
        : undefined,
      municipality: muni,
      history: [
        {
          id: 'hist-' + Date.now(),
          action: 'created',
          timestamp: new Date().toISOString(),
          userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
          organizationName: currentUser?.organization?.name || 'Sztab Kryzysowy',
          details: 'Utworzenie alertu w systemie',
        },
      ],
      neededResources: Array.isArray(data.neededResources)
        ? data.neededResources.map((nr) => ({
            ...nr,
            id: nr.id || 'nr-' + Math.random().toString(36).substr(2, 6),
            quantityAllocated: nr.quantityAllocated || 0,
            allocations: nr.allocations || [],
          }))
        : [],
      posts: [],
    };

    this.db.alerts.unshift(newAlert);
    this.addAuditLog(
      'alert_created',
      'alert',
      id,
      `Utworzono komunikat: "${newAlert.title}"`,
      null,
      newAlert,
      id,
      newAlert.title
    );
    this.persist();
    return newAlert;
  }

  public updateAlert(id: string, updates: Partial<AlertMapItem>): AlertMapItem {
    const idx = this.db.alerts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Alert nie istnieje');

    const prev = JSON.parse(JSON.stringify(this.db.alerts[idx]));
    const currentUser = this.getCurrentUser();
    const history = this.db.alerts[idx].history || [];

    history.push({
      id: 'hist-' + Date.now(),
      action: 'updated',
      timestamp: new Date().toISOString(),
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
      organizationName: currentUser?.organization?.name || 'Sztab Kryzysowy',
      details: 'Aktualizacja parametrów alertu',
    });

    this.db.alerts[idx] = {
      ...this.db.alerts[idx],
      ...updates,
      history,
    };

    const updated = this.db.alerts[idx];
    this.addAuditLog(
      'alert_updated',
      'alert',
      id,
      `Zaktualizowano dane alertu: "${updated.title}"`,
      prev,
      updated,
      id,
      updated.title || undefined
    );
    this.persist();
    return updated;
  }

  public deactivateAlert(id: string): AlertMapItem {
    const idx = this.db.alerts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Alert nie istnieje');

    const prev = JSON.parse(JSON.stringify(this.db.alerts[idx]));
    const currentUser = this.getCurrentUser();
    const history = this.db.alerts[idx].history || [];

    history.push({
      id: 'hist-' + Date.now(),
      action: 'deactivated',
      timestamp: new Date().toISOString(),
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
      organizationName: currentUser?.organization?.name || 'Sztab Kryzysowy',
      details: 'Odwołanie i archiwizacja alertu kryzysowego',
    });

    this.db.alerts[idx].isActive = false;
    this.db.alerts[idx].history = history;

    const updated = this.db.alerts[idx];
    this.addAuditLog(
      'alert_deactivated',
      'alert',
      id,
      `Odwołano komunikat: "${updated.title}"`,
      prev,
      updated,
      id,
      updated.title || undefined
    );
    this.persist();
    return updated;
  }

  public reactivateAlert(id: string): AlertMapItem {
    const idx = this.db.alerts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Alert nie istnieje');

    const prev = JSON.parse(JSON.stringify(this.db.alerts[idx]));
    const currentUser = this.getCurrentUser();
    const history = this.db.alerts[idx].history || [];

    history.push({
      id: 'hist-' + Date.now(),
      action: 'reactivated',
      timestamp: new Date().toISOString(),
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
      organizationName: currentUser?.organization?.name || 'Sztab Kryzysowy',
      details: 'Wznowienie i ponowna aktywacja alertu kryzysowego',
    });

    this.db.alerts[idx].isActive = true;
    this.db.alerts[idx].history = history;

    const updated = this.db.alerts[idx];
    this.addAuditLog(
      'alert_reactivated',
      'alert',
      id,
      `Wznowiono komunikat: "${updated.title}"`,
      prev,
      updated,
      id,
      updated.title || undefined
    );
    this.persist();
    return updated;
  }

  public deleteAlert(id: string): boolean {
    const alert = this.db.alerts.find((a) => a.id === id);
    if (!alert) return false;
    this.db.alerts = this.db.alerts.filter((a) => a.id !== id);
    this.addAuditLog('alert_deleted', 'alert', id, `Trwale usunięto alert: "${alert.title}"`, alert, null, id, alert.title || undefined);
    this.persist();
    return true;
  }

  // --- POSTS & FORUM MESSAGES ---
  public addPostToAlert(
    alertId: string,
    postData: { title: string; content: string; postType?: string }
  ): AlertPostItem {
    const alert = this.db.alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert nie istnieje');

    const currentUser = this.getCurrentUser();
    const newPost: AlertPostItem = {
      id: 'post-' + Date.now(),
      authorId: currentUser?.id || 'usr-admin',
      authorName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
      organizationName: currentUser?.organization?.name || 'Sztab',
      role: currentUser?.role || 'czlonek',
      title: postData.title,
      content: postData.content,
      postType: postData.postType || 'ogolne',
      createdAt: new Date().toISOString(),
      messages: [],
    };

    if (!Array.isArray(alert.posts)) {
      alert.posts = [];
    }
    alert.posts.unshift(newPost);

    this.addAuditLog(
      'post_added',
      'alert_post',
      newPost.id,
      `Dodano wpis "${newPost.title}" w zdarzeniu "${alert.title}"`,
      null,
      newPost,
      alert.id,
      alert.title || undefined
    );

    this.persist();
    return newPost;
  }

  public addMessageToPost(alertId: string, postId: string, content: string): PostChatMessage {
    const alert = this.db.alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert nie istnieje');

    const post = alert.posts?.find((p) => p.id === postId);
    if (!post) throw new Error('Wpis nie istnieje');

    const currentUser = this.getCurrentUser();
    const newMsg: PostChatMessage = {
      id: 'msg-' + Date.now(),
      authorId: currentUser?.id || 'usr-admin',
      authorName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Dyspozytor',
      organizationName: currentUser?.organization?.name || 'Sztab',
      role: currentUser?.role || 'czlonek',
      content,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(post.messages)) post.messages = [];
    post.messages.push(newMsg);

    this.persist();
    return newMsg;
  }

  // --- RESOURCE ALLOCATION ---
  public allocateResource(
    alertId: string,
    allocationData: {
      neededResourceId: string;
      orgResourceId?: string;
      quantity: number;
      note?: string;
    }
  ): { alert: AlertMapItem; neededResource: NeededResourceItem; allocation: ResourceAllocationRecord } {
    const alert = this.db.alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert nie istnieje');

    const neededResource = alert.neededResources?.find((nr) => nr.id === allocationData.neededResourceId);
    if (!neededResource) throw new Error('Zapotrzebowanie nie istnieje w tym alercie');

    const currentUser = this.getCurrentUser();
    const qty = Number(allocationData.quantity) || 1;

    const allocation: ResourceAllocationRecord = {
      id: 'al-' + Date.now(),
      resourceId: allocationData.orgResourceId,
      organizationId: currentUser?.organizationId || 'org-1',
      organizationName: currentUser?.organization?.name || 'Organizacja wspierająca',
      userId: currentUser?.id || 'usr-admin',
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Koordynator',
      quantity: qty,
      allocatedAt: new Date().toISOString(),
      note: allocationData.note || undefined,
    };

    if (!Array.isArray(neededResource.allocations)) {
      neededResource.allocations = [];
    }
    neededResource.allocations.push(allocation);
    neededResource.quantityAllocated = (neededResource.quantityAllocated || 0) + qty;

    // Aktualizacja magazynu jeśli podano id zasobu
    if (allocationData.orgResourceId) {
      const warehouseRes = this.db.resources.find((r) => r.id === allocationData.orgResourceId);
      if (warehouseRes && warehouseRes.quantity >= qty) {
        warehouseRes.quantity -= qty;
      }
    }

    this.addAuditLog(
      'resource_allocated',
      'resource',
      allocation.id,
      `Przydzielono ${qty} ${neededResource.unit} na "${neededResource.name}" w zdarzeniu "${alert.title}"`,
      null,
      allocation,
      alert.id,
      alert.title || undefined
    );

    this.persist();
    return {
      alert,
      neededResource,
      allocation,
    };
  }

  // --- WAREHOUSE RESOURCES ---
  public getWarehouseResources(organizationId?: string, municipalityId?: string): MockResource[] {
    const list = Array.isArray(this.db.resources) ? this.db.resources : [];
    return list
      .filter((r) => {
        if (organizationId && r.organizationId !== organizationId) return false;
        if (municipalityId) {
          const org = this.db.organizations.find((o) => o.id === r.organizationId);
          if (org && org.municipalityId !== municipalityId) return false;
        }
        return true;
      })
      .map((r) => {
        const org = this.db.organizations.find((o) => o.id === r.organizationId);
        const muni = org ? this.db.municipalities.find((m) => m.id === org.municipalityId) : undefined;
        return {
          ...r,
          organization: org ? { ...org, municipality: muni } : r.organization,
        };
      });
  }

  public createWarehouseResource(data: {
    type: 'ludzie' | 'woda' | 'sprzet' | 'inne';
    subcategory?: string;
    quantity: number;
    timeframe: '24h' | '48h' | '72h' | 'tydzien';
    organizationId?: string;
  }): MockResource {
    const currentUser = this.getCurrentUser();
    const newRes: MockResource = {
      id: 'res-' + Date.now(),
      organizationId: data.organizationId || currentUser?.organizationId || 'org-1',
      type: data.type,
      subcategory: data.subcategory || null,
      quantity: Number(data.quantity) || 1,
      timeframe: data.timeframe || '24h',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.db.resources.unshift(newRes);
    const org = this.db.organizations.find((o) => o.id === newRes.organizationId);
    newRes.organization = org;

    this.addAuditLog(
      'resource_created',
      'resource',
      newRes.id,
      `Dodano zasób do magazynu: ${newRes.quantity}x ${newRes.subcategory || newRes.type} (${newRes.timeframe})`,
      null,
      newRes
    );

    this.persist();
    return newRes;
  }

  // --- USERS & ADMIN ---
  public getUsers(): User[] {
    return this.db.users.map((u) => {
      const org = this.db.organizations.find((o) => o.id === u.organizationId);
      const muni = org ? this.db.municipalities.find((m) => m.id === org.municipalityId) : undefined;
      return {
        ...u,
        organization: org ? { ...org, municipality: muni } : undefined,
      };
    });
  }

  public getPendingUsers(): User[] {
    return this.getUsers().filter((u) => !u.isVerified);
  }

  public createUser(userData: Partial<User>): User {
    const id = 'usr-' + Date.now();
    const newUser: User = {
      id,
      firstName: userData.firstName || 'Jan',
      lastName: userData.lastName || 'Kowalski',
      email: (userData.email || `user_${Date.now()}@fundacjaq.pl`).toLowerCase(),
      phone: userData.phone || '+48 500 000 000',
      role: userData.role || 'czlonek',
      organizationId: userData.organizationId || 'org-1',
      isVerified: userData.isVerified ?? true,
      createdAt: new Date().toISOString(),
    };

    const org = this.db.organizations.find((o) => o.id === newUser.organizationId);
    const muni = org ? this.db.municipalities.find((m) => m.id === org.municipalityId) : undefined;
    newUser.organization = org ? { ...org, municipality: muni } : undefined;

    this.db.users.unshift(newUser);
    this.addAuditLog(
      'user_created',
      'user',
      id,
      `Utworzono konto użytkownika: ${newUser.firstName} ${newUser.lastName} (${newUser.role})`,
      null,
      newUser
    );
    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const idx = this.db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Użytkownik nie istnieje');

    const prev = JSON.parse(JSON.stringify(this.db.users[idx]));
    this.db.users[idx] = {
      ...this.db.users[idx],
      ...updates,
    };

    const org = this.db.organizations.find((o) => o.id === this.db.users[idx].organizationId);
    const muni = org ? this.db.municipalities.find((m) => m.id === org.municipalityId) : undefined;
    this.db.users[idx].organization = org ? { ...org, municipality: muni } : undefined;

    const updated = this.db.users[idx];
    this.addAuditLog(
      'user_updated',
      'user',
      id,
      `Zaktualizowano profil użytkownika: ${updated.firstName} ${updated.lastName}`,
      prev,
      updated
    );
    this.persist();
    return updated;
  }

  public verifyUser(id: string): User {
    return this.updateUser(id, { isVerified: true });
  }

  public deleteUser(id: string): boolean {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) return false;
    this.db.users = this.db.users.filter((u) => u.id !== id);
    this.addAuditLog(
      'user_deleted',
      'user',
      id,
      `Usunięto użytkownika: ${user.firstName} ${user.lastName} (${user.email})`,
      user,
      null
    );
    this.persist();
    return true;
  }

  // --- ORGANIZATIONS & MUNICIPALITIES ---
  public getOrganizations(): Organization[] {
    return this.db.organizations.map((org) => {
      const muni = this.db.municipalities.find((m) => m.id === org.municipalityId);
      return {
        ...org,
        municipality: muni,
      };
    });
  }

  public createOrganization(data: Partial<Organization>): Organization {
    const id = 'org-' + Date.now();
    const newOrg: Organization = {
      id,
      name: data.name || 'Nowa Organizacja',
      type: data.type || 'sluzby',
      municipalityId: data.municipalityId || 'muni-1',
    };
    const muni = this.db.municipalities.find((m) => m.id === newOrg.municipalityId);
    newOrg.municipality = muni;

    this.db.organizations.unshift(newOrg);
    this.addAuditLog(
      'org_created',
      'organization',
      id,
      `Utworzono organizację: "${newOrg.name}" (${newOrg.type})`,
      null,
      newOrg
    );
    this.persist();
    return newOrg;
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization {
    const idx = this.db.organizations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Organizacja nie istnieje');

    const prev = JSON.parse(JSON.stringify(this.db.organizations[idx]));
    this.db.organizations[idx] = {
      ...this.db.organizations[idx],
      ...updates,
    };
    const muni = this.db.municipalities.find((m) => m.id === this.db.organizations[idx].municipalityId);
    this.db.organizations[idx].municipality = muni;

    const updated = this.db.organizations[idx];
    this.addAuditLog(
      'org_updated',
      'organization',
      id,
      `Zaktualizowano organizację: "${updated.name}"`,
      prev,
      updated
    );
    this.persist();
    return updated;
  }

  public deleteOrganization(id: string): boolean {
    const org = this.db.organizations.find((o) => o.id === id);
    if (!org) return false;
    this.db.organizations = this.db.organizations.filter((o) => o.id !== id);
    this.addAuditLog('org_deleted', 'organization', id, `Usunięto organizację: "${org.name}"`, org, null);
    this.persist();
    return true;
  }

  public getMunicipalities(): Municipality[] {
    return this.db.municipalities;
  }

  // --- AUDIT LOGS QUERY & REVERT ---
  public getAuditLogs(params?: {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: string;
    alertId?: string;
  }): { logs: MockAuditLog[]; totalCount: number } {
    let list = Array.isArray(this.db.auditLogs) ? [...this.db.auditLogs] : [];

    if (params?.entityType) {
      list = list.filter((l) => l.entityType === params.entityType);
    }
    if (params?.action) {
      list = list.filter((l) => l.action === params.action);
    }
    if (params?.alertId) {
      list = list.filter((l) => l.alertId === params.alertId);
    }

    const totalCount = list.length;
    const offset = Number(params?.offset) || 0;
    const limit = Number(params?.limit) || 100;
    const sliced = list.slice(offset, offset + limit);

    return {
      logs: sliced,
      totalCount,
    };
  }

  public revertAuditLog(logId: string): boolean {
    const log = this.db.auditLogs?.find((l) => l.id === logId);
    if (!log || log.isReverted) return false;

    const currentUser = this.getCurrentUser();

    // Revert entity based on previousState
    if (log.entityType === 'alert' && log.previousState) {
      const idx = this.db.alerts.findIndex((a) => a.id === log.entityId);
      if (idx !== -1) {
        this.db.alerts[idx] = { ...log.previousState };
      } else {
        this.db.alerts.unshift(log.previousState);
      }
    } else if (log.entityType === 'user' && log.previousState) {
      const idx = this.db.users.findIndex((u) => u.id === log.entityId);
      if (idx !== -1) {
        this.db.users[idx] = { ...this.db.users[idx], ...log.previousState };
      }
    }

    log.isReverted = true;
    log.revertedAt = new Date().toISOString();
    log.revertedByUserId = currentUser?.id || 'usr-admin';
    log.revertedByUserName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrator';

    this.persist();
    return true;
  }
}

export const mockStorage = new MockStorageService();
