import { mockStorage } from './mockStorage';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

// Symulacja bardzo szybkiego opóźnienia sieciowego (30ms) dla płynnego UX
const delay = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

const makeResponse = <T>(payload: T, status = 200): ApiResponse<T> => ({
  data: payload,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  headers: {},
  config: {},
});

export const api = {
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },

  async get<T = any>(url: string, config?: { params?: any }): Promise<ApiResponse<T>> {
    await delay();
    const cleanUrl = url.split('?')[0];
    const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const params = { ...Object.fromEntries(urlParams.entries()), ...(config?.params || {}) };

    const currentUser = mockStorage.getCurrentUser();

    // 1. ALERTS
    if (cleanUrl === '/alerts/public') {
      const all = mockStorage.getAlerts();
      const active = all.filter((a) => a.isActive);
      return makeResponse({
        success: true,
        data: active,
        alerts: active,
      } as any);
    }

    if (cleanUrl === '/alerts/operational') {
      const all = mockStorage.getAlerts();
      const active = all.filter((a) => a.isActive);
      return makeResponse({
        success: true,
        data: active,
        alerts: active,
      } as any);
    }

    if (cleanUrl === '/alerts/my-municipality') {
      const all = mockStorage.getAlerts();
      const scope = params.scope || 'all';
      let filtered = all;

      if (scope === 'operational') {
        filtered = filtered.filter((a) => a.isActive);
      } else if (scope === 'archived') {
        filtered = filtered.filter((a) => !a.isActive);
      } else if (scope === 'my_municipality') {
        if (currentUser?.organization?.municipalityId) {
          filtered = filtered.filter((a) => a.municipalityId === currentUser.organization?.municipalityId);
        }
      }

      return makeResponse({
        success: true,
        data: filtered,
        alerts: filtered,
      } as any);
    }

    if (cleanUrl.match(/^\/alerts\/[^/]+$/)) {
      const id = cleanUrl.replace('/alerts/', '');
      const alert = mockStorage.getAlertById(id);
      if (!alert) {
        throw { response: { status: 404, data: { success: false, message: 'Alert nie znaleziony' } } };
      }
      return makeResponse({
        success: true,
        data: alert,
        alert,
      } as any);
    }

    // 2. RESOURCES
    if (cleanUrl === '/resources/my-organization') {
      let resources = mockStorage.getWarehouseResources(currentUser?.organizationId);
      if (!resources || resources.length === 0) {
        resources = mockStorage.getWarehouseResources();
      }
      return makeResponse({
        success: true,
        data: resources,
        resources,
      } as any);
    }

    if (cleanUrl === '/resources/my-municipality') {
      let resources: any[] = [];
      if (currentUser?.role === 'admin') {
        resources = mockStorage.getWarehouseResources();
      } else {
        const muniId = currentUser?.organization?.municipalityId;
        resources = mockStorage.getWarehouseResources(undefined, muniId);
        if (!resources || resources.length === 0) {
          resources = mockStorage.getWarehouseResources();
        }
      }
      return makeResponse({
        success: true,
        data: resources,
        resources,
      } as any);
    }

    // 3. ORGANIZATIONS & MUNICIPALITIES
    if (cleanUrl === '/organizations' || cleanUrl === '/admin/organizations') {
      const orgs = mockStorage.getOrganizations();
      return makeResponse({
        success: true,
        data: orgs,
      } as any);
    }

    if (cleanUrl === '/admin/municipalities') {
      const munis = mockStorage.getMunicipalities();
      return makeResponse({
        success: true,
        data: munis,
      } as any);
    }

    // 4. ADMIN USERS
    if (cleanUrl === '/admin/users') {
      const users = mockStorage.getUsers();
      return makeResponse({
        success: true,
        data: users,
      } as any);
    }

    if (cleanUrl === '/admin/users/pending') {
      const pending = mockStorage.getPendingUsers();
      return makeResponse({
        success: true,
        data: pending,
      } as any);
    }

    // 5. AUDIT LOGS
    if (cleanUrl === '/admin/logs') {
      const logsResult = mockStorage.getAuditLogs(params);
      return makeResponse({
        success: true,
        data: logsResult.logs,
        logs: logsResult.logs,
        totalCount: logsResult.totalCount,
      } as any);
    }

    console.warn('[Mock API] Unhandled GET route:', url);
    return makeResponse({ success: true, data: [] } as any);
  },

  async post<T = any>(url: string, data?: any, _config?: any): Promise<ApiResponse<T>> {
    await delay();
    const cleanUrl = url.split('?')[0];

    // 1. AUTH
    if (cleanUrl === '/auth/login') {
      const email = data?.email?.toLowerCase()?.trim();
      const users = mockStorage.getUsers();
      let foundUser = users.find((u) => u.email.toLowerCase() === email);

      if (!foundUser) {
        if (email.includes('admin')) {
          foundUser = users.find((u) => u.role === 'admin') || users[0];
        } else if (email.includes('koord')) {
          foundUser = users.find((u) => u.role === 'koordynator') || users[1];
        } else {
          foundUser = users.find((u) => u.role === 'czlonek') || users[0];
        }
      }

      if (foundUser) {
        const token = 'mock-jwt-token-' + foundUser.id;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(foundUser));
        return makeResponse({
          success: true,
          token,
          user: foundUser,
        } as any);
      }

      return makeResponse(
        {
          success: false,
          message: 'Nieprawidłowy login lub hasło',
        } as any,
        401
      );
    }

    if (cleanUrl === '/auth/register') {
      const newUser = mockStorage.createUser({
        ...data,
        isVerified: false,
      });
      const token = 'mock-jwt-token-' + newUser.id;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));

      return makeResponse({
        success: true,
        token,
        user: newUser,
        message: 'Konto zostało zarejestrowane i oczekuje na akceptację przez administratora.',
      } as any);
    }

    // 2. ALERTS
    if (cleanUrl === '/alerts') {
      const newAlert = mockStorage.createAlert(data);
      return makeResponse({
        success: true,
        data: newAlert,
        alert: newAlert,
        message: 'Alert został utworzony pomyślnie',
      } as any, 201);
    }

    // Dodawanie wpisu/posta
    if (cleanUrl.match(/^\/alerts\/[^/]+\/posts$/)) {
      const alertId = cleanUrl.split('/')[2];
      const post = mockStorage.addPostToAlert(alertId, data);
      const updatedAlert = mockStorage.getAlertById(alertId);
      return makeResponse({
        success: true,
        data: updatedAlert,
        post,
        message: 'Wpis został dodany',
      } as any, 201);
    }

    // Dodawanie wiadomości do posta
    if (cleanUrl.match(/^\/alerts\/[^/]+\/posts\/[^/]+\/messages$/)) {
      const parts = cleanUrl.split('/');
      const alertId = parts[2];
      const postId = parts[4];
      const message = mockStorage.addMessageToPost(alertId, postId, data.content);
      const updatedAlert = mockStorage.getAlertById(alertId);
      return makeResponse({
        success: true,
        data: updatedAlert,
        messageData: message,
        message: 'Wiadomość wysłana',
      } as any, 201);
    }

    // Alokacja zasobów
    if (cleanUrl.match(/^\/alerts\/[^/]+\/allocate-resource$/)) {
      const alertId = cleanUrl.split('/')[2];
      const result = mockStorage.allocateResource(alertId, data);
      return makeResponse({
        success: true,
        data: result.alert,
        alert: result.alert,
        neededResource: result.neededResource,
        allocation: result.allocation,
        message: 'Zasoby zostały pomyślnie przekazane na miejsce zdarzenia!',
      } as any);
    }

    // 3. RESOURCES
    if (cleanUrl === '/resources') {
      const newRes = mockStorage.createWarehouseResource(data);
      return makeResponse({
        success: true,
        data: newRes,
        resource: newRes,
        message: 'Zasób dodany do magazynu',
      } as any, 201);
    }

    // 4. ADMIN
    if (cleanUrl === '/admin/users') {
      const newUser = mockStorage.createUser(data);
      return makeResponse({
        success: true,
        data: newUser,
        user: newUser,
        message: 'Użytkownik został utworzony',
      } as any, 201);
    }

    if (cleanUrl === '/admin/organizations') {
      const newOrg = mockStorage.createOrganization(data);
      return makeResponse({
        success: true,
        data: newOrg,
        message: 'Organizacja została utworzona',
      } as any, 201);
    }

    if (cleanUrl.match(/^\/admin\/logs\/[^/]+\/revert$/)) {
      const logId = cleanUrl.split('/')[3];
      const ok = mockStorage.revertAuditLog(logId);
      return makeResponse({
        success: ok,
        message: ok ? 'Zmiana została pomyślnie cofnięta' : 'Nie udało się cofnąć operacji',
      } as any);
    }

    console.warn('[Mock API] Unhandled POST route:', url, data);
    return makeResponse({ success: true } as any);
  },

  async put<T = any>(url: string, data?: any, _config?: any): Promise<ApiResponse<T>> {
    await delay();
    const cleanUrl = url.split('?')[0];

    // Edycja alertu
    if (cleanUrl.match(/^\/alerts\/[^/]+$/)) {
      const id = cleanUrl.replace('/alerts/', '');
      const updated = mockStorage.updateAlert(id, data);
      return makeResponse({
        success: true,
        data: updated,
        alert: updated,
        message: 'Alert zaktualizowany',
      } as any);
    }

    // Edycja użytkownika
    if (cleanUrl.match(/^\/admin\/users\/[^/]+$/)) {
      const id = cleanUrl.replace('/admin/users/', '');
      const updated = mockStorage.updateUser(id, data);
      return makeResponse({
        success: true,
        data: updated,
        user: updated,
        message: 'Użytkownik zaktualizowany',
      } as any);
    }

    // Edycja organizacji
    if (cleanUrl.match(/^\/admin\/organizations\/[^/]+$/)) {
      const id = cleanUrl.replace('/admin/organizations/', '');
      const updated = mockStorage.updateOrganization(id, data);
      return makeResponse({
        success: true,
        data: updated,
        message: 'Organizacja zaktualizowana',
      } as any);
    }

    console.warn('[Mock API] Unhandled PUT route:', url, data);
    return makeResponse({ success: true } as any);
  },

  async patch<T = any>(url: string, data?: any, _config?: any): Promise<ApiResponse<T>> {
    await delay();
    const cleanUrl = url.split('?')[0];

    // Deaktywacja alertu
    if (cleanUrl.match(/^\/alerts\/[^/]+\/deactivate$/)) {
      const id = cleanUrl.split('/')[2];
      const updated = mockStorage.deactivateAlert(id);
      return makeResponse({
        success: true,
        data: updated,
        alert: updated,
        message: 'Alert został odwołany',
      } as any);
    }

    // Reaktywacja alertu
    if (cleanUrl.match(/^\/alerts\/[^/]+\/reactivate$/)) {
      const id = cleanUrl.split('/')[2];
      const updated = mockStorage.reactivateAlert(id);
      return makeResponse({
        success: true,
        data: updated,
        alert: updated,
        message: 'Alert został wznowiony',
      } as any);
    }

    // Weryfikacja użytkownika
    if (cleanUrl.match(/^\/admin\/users\/[^/]+\/verify$/)) {
      const id = cleanUrl.split('/')[3];
      const verified = mockStorage.verifyUser(id);
      return makeResponse({
        success: true,
        data: verified,
        user: verified,
        message: 'Użytkownik został zweryfikowany',
      } as any);
    }

    // Przypisanie organizacji
    if (cleanUrl.match(/^\/admin\/users\/[^/]+\/assign-organization$/)) {
      const id = cleanUrl.split('/')[3];
      const updated = mockStorage.updateUser(id, { organizationId: data.organizationId });
      return makeResponse({
        success: true,
        data: updated,
        user: updated,
        message: 'Pracownik został pomyślnie przepisany do organizacji.',
      } as any);
    }

    console.warn('[Mock API] Unhandled PATCH route:', url, data);
    return makeResponse({ success: true } as any);
  },

  async delete<T = any>(url: string, _config?: any): Promise<ApiResponse<T>> {
    await delay();
    const cleanUrl = url.split('?')[0];

    // Usunięcie alertu
    if (cleanUrl.match(/^\/alerts\/[^/]+$/)) {
      const id = cleanUrl.replace('/alerts/', '');
      const ok = mockStorage.deleteAlert(id);
      return makeResponse({
        success: ok,
        message: ok ? 'Alert został trwale usunięty z systemu.' : 'Nie znaleziono alertu',
      } as any);
    }

    // Usunięcie / odrzucenie użytkownika
    if (cleanUrl.match(/^\/admin\/users\/[^/]+(\/reject)?$/)) {
      const id = cleanUrl.split('/')[3];
      const ok = mockStorage.deleteUser(id);
      return makeResponse({
        success: ok,
        message: ok ? 'Użytkownik został usunięty' : 'Nie znaleziono użytkownika',
      } as any);
    }

    // Usunięcie organizacji
    if (cleanUrl.match(/^\/admin\/organizations\/[^/]+$/)) {
      const id = cleanUrl.replace('/admin/organizations/', '');
      const ok = mockStorage.deleteOrganization(id);
      return makeResponse({
        success: ok,
        message: ok ? 'Organizacja została usunięta' : 'Nie znaleziono organizacji',
      } as any);
    }

    console.warn('[Mock API] Unhandled DELETE route:', url);
    return makeResponse({ success: true } as any);
  },
};

export default api;
