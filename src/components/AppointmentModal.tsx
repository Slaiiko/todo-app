import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calendar, Clock, MapPin, Phone, Mail, Users } from 'lucide-react';
import { Appointment, AppointmentParticipant, Affaire } from '../types';
import TimePicker from './TimePicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<Appointment>) => Promise<void>;
  affaires: Affaire[];
  existingAppointment?: Appointment | null;
}

interface FormParticipant extends Omit<AppointmentParticipant, 'id' | 'appointment_id' | 'created_at'> {
  id?: number;
}

export default function AppointmentModal({ isOpen, onClose, onSave, affaires, existingAppointment }: Props) {
  const [title, setTitle] = useState(existingAppointment?.title || '');
  const [description, setDescription] = useState(existingAppointment?.description || '');
  const [location, setLocation] = useState(existingAppointment?.location || '');
  
  // Parse existing appointment times
  const getDateFromAppointment = () => {
    if (existingAppointment?.start_time) {
      return existingAppointment.start_time.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const getStartHourFromAppointment = () => {
    if (existingAppointment?.start_time) {
      return existingAppointment.start_time.split('T')[1].substring(0, 5);
    }
    return '09:00';
  };
  
  const getEndHourFromAppointment = () => {
    if (existingAppointment?.end_time) {
      return existingAppointment.end_time.split('T')[1].substring(0, 5);
    }
    return '10:00';
  };
  
  const [appointmentDate, setAppointmentDate] = useState(getDateFromAppointment());
  const [startHour, setStartHour] = useState(getStartHourFromAppointment());
  const [endHour, setEndHour] = useState(getEndHourFromAppointment());
  const [affaireId, setAffaireId] = useState<number | null>(existingAppointment?.affaire_id || null);
  const [videoLink, setVideoLink] = useState(existingAppointment?.video_call_link || '');
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(existingAppointment?.recurrence_type || null);
  const [recurrenceEnd, setRecurrenceEnd] = useState(existingAppointment?.recurrence_end_date || '');
  const [participants, setParticipants] = useState<FormParticipant[]>(existingAppointment?.participants || []);
  const [newParticipant, setNewParticipant] = useState<FormParticipant>({
    first_name: '',
    last_name: '',
    company_entity: '',
    phone: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddParticipant = () => {
    if (newParticipant.first_name.trim() || newParticipant.email.trim()) {
      setParticipants([...participants, { ...newParticipant, id: Date.now() }]);
      setNewParticipant({
        first_name: '',
        last_name: '',
        company_entity: '',
        phone: '',
        email: ''
      });
    }
  };

  const handleRemoveParticipant = (id: number | undefined) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !appointmentDate || !startHour || !endHour) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    // Rebuild ISO 8601 datetime strings
    const start_time = `${appointmentDate}T${startHour}:00`;
    const end_time = `${appointmentDate}T${endHour}:00`;

    setIsSubmitting(true);
    try {
      await onSave({
        title,
        description,
        location,
        start_time,
        end_time,
        affaire_id: affaireId,
        video_call_link: videoLink,
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEnd,
        participants
      } as Partial<Appointment>);
      handleClose();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde du rendez-vous: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setAppointmentDate(new Date().toISOString().split('T')[0]);
    setStartHour('09:00');
    setEndHour('10:00');
    setAffaireId(null);
    setVideoLink('');
    setRecurrenceType(null);
    setRecurrenceEnd('');
    setParticipants([]);
    setNewParticipant({ first_name: '', last_name: '', company_entity: '', phone: '', email: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">
                  {existingAppointment ? 'Éditer rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="p-8 space-y-6">
              {/* Titre et affaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Titre du rendez-vous *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Réunion commerciale"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Affaire liée
                  </label>
                  <select
                    value={affaireId || ''}
                    onChange={(e) => setAffaireId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Aucune affaire</option>
                    {affaires.map(aff => (
                      <option key={aff.id} value={aff.id}>
                        {aff.number} - {aff.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date et horaires */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date du rendez-vous *
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Heure de début *
                  </label>
                  <TimePicker value={startHour} onChange={setStartHour} label="Début" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Heure de fin *
                  </label>
                  <TimePicker value={endHour} onChange={setEndHour} label="Fin" />
                </div>
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lieu du rendez-vous
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  name="appointment-location"
                  autoComplete="off"
                  placeholder="Ex: Salle de conférence A - Building C"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Visioconférence */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lien de visioconférence
                </label>
                <input
                  type="text"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://zoom.us/j/... ou https://meet.google.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commentaires et notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajoutez des commentaires, ordre du jour, etc."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Récurrence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Récurrence
                  </label>
                  <select
                    value={recurrenceType || ''}
                    onChange={(e) => setRecurrenceType((e.target.value as any) || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Aucune récurrence</option>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                    <option value="yearly">Annuelle</option>
                  </select>
                </div>
                {recurrenceType && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fin de la récurrence (optionnel)
                    </label>
                    <input
                      type="date"
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants
                </h3>

                {/* Ajout participant */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={newParticipant.first_name}
                      onChange={(e) => setNewParticipant({ ...newParticipant, first_name: e.target.value })}
                      placeholder="Prénom"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={newParticipant.last_name}
                      onChange={(e) => setNewParticipant({ ...newParticipant, last_name: e.target.value })}
                      placeholder="Nom"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={newParticipant.company_entity}
                      onChange={(e) => setNewParticipant({ ...newParticipant, company_entity: e.target.value })}
                      placeholder="Entité d'entreprise"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="email"
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                      placeholder="Email"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                      placeholder="Téléphone"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddParticipant}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter participant
                    </button>
                  </div>
                </div>

                {/* Liste des participants */}
                {participants.length > 0 && (
                  <div className="space-y-2">
                    {participants.map((participant, idx) => (
                      <motion.div
                        key={participant.id || idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between bg-gray-100 p-3 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">
                            {participant.first_name} {participant.last_name}
                          </p>
                          <div className="text-sm text-gray-600 space-y-1">
                            {participant.company_entity && <p>{participant.company_entity}</p>}
                            <div className="flex gap-4">
                              {participant.email && (
                                <a href={`mailto:${participant.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                                  <Mail className="w-3 h-3" />
                                  {participant.email}
                                </a>
                              )}
                              {participant.phone && (
                                <a href={`tel:${participant.phone}`} className="flex items-center gap-1 hover:text-indigo-600">
                                  <Phone className="w-3 h-3" />
                                  {participant.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-red-600 hover:bg-red-100 rounded-lg p-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sauvegarde...' : 'Créer rendez-vous'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


