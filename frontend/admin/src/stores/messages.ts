import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { ContactRequest, ContactStatus, ContactUpdate, EmailLog, EmailStatus, ResendResult } from '@/types/messages';

export interface EmailFilters {
  query: string;
  status: EmailStatus | 'ALL';
}

export interface ContactFilters {
  query: string;
  status: ContactStatus | 'ALL';
}

function includes(text: string | null | undefined, needle: string): boolean {
  return (text ?? '').toLowerCase().includes(needle);
}

/**
 * Comunicación con clientes: correos que envió el sistema (con reenvío de la
 * confirmación) y solicitudes del formulario de contacto del sitio.
 */
export const useMessagesStore = defineStore('messages', () => {
  const emails = ref<EmailLog[]>([]);
  const emailsLoading = ref(false);
  const emailsLoaded = ref(false);
  const emailsError = ref<string | null>(null);
  const emailFilters = reactive<EmailFilters>({ query: '', status: 'ALL' });

  const contacts = ref<ContactRequest[]>([]);
  const contactsLoading = ref(false);
  const contactsLoaded = ref(false);
  const contactsError = ref<string | null>(null);
  const contactFilters = reactive<ContactFilters>({ query: '', status: 'ALL' });

  async function loadEmails(force = false) {
    if ((emailsLoaded.value && !force) || emailsLoading.value) return;
    emailsLoading.value = true;
    emailsError.value = null;
    try {
      emails.value = await api<EmailLog[]>('/admin/emails');
      emailsLoaded.value = true;
    } catch (e) {
      emailsError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los correos.';
    } finally {
      emailsLoading.value = false;
    }
  }

  async function loadContacts(force = false) {
    if ((contactsLoaded.value && !force) || contactsLoading.value) return;
    contactsLoading.value = true;
    contactsError.value = null;
    try {
      contacts.value = await api<ContactRequest[]>('/admin/contact-requests');
      contactsLoaded.value = true;
    } catch (e) {
      contactsError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los mensajes.';
    } finally {
      contactsLoading.value = false;
    }
  }

  /** Reenvía la confirmación de una orden; refresca el registro para mostrar el intento nuevo. */
  async function resendConfirmation(reservationId: number): Promise<ResendResult> {
    const result = await api<ResendResult>(`/admin/orders/${reservationId}/resend-confirmation`, { method: 'POST' });
    await loadEmails(true);
    return result;
  }

  async function updateContact(id: number, changes: ContactUpdate): Promise<void> {
    const updated = await api<ContactRequest>(`/admin/contact-requests/${id}`, { method: 'PATCH', json: changes });
    const index = contacts.value.findIndex((contact) => contact.id === id);
    if (index >= 0) contacts.value[index] = updated;
  }

  const filteredEmails = computed(() => {
    const needle = emailFilters.query.trim().toLowerCase();
    return emails.value.filter((email) => {
      if (emailFilters.status !== 'ALL' && email.status !== emailFilters.status) return false;
      if (!needle) return true;
      return [email.toEmail, email.subject, email.reservationCode, email.customerName].some((text) => includes(text, needle));
    });
  });

  const filteredContacts = computed(() => {
    const needle = contactFilters.query.trim().toLowerCase();
    return contacts.value.filter((contact) => {
      if (contactFilters.status !== 'ALL' && contact.status !== contactFilters.status) return false;
      if (!needle) return true;
      return [contact.name, contact.email, contact.phone, contact.hotelName, contact.message].some((text) => includes(text, needle));
    });
  });

  const failedEmails = computed(() => emails.value.filter((email) => email.status === 'FAILED').length);
  const newContacts = computed(() => contacts.value.filter((contact) => contact.status === 'NEW').length);

  return {
    emails,
    emailsLoading,
    emailsError,
    emailFilters,
    filteredEmails,
    failedEmails,
    loadEmails,
    resendConfirmation,
    contacts,
    contactsLoading,
    contactsError,
    contactFilters,
    filteredContacts,
    newContacts,
    loadContacts,
    updateContact,
  };
});
