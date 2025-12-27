import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, Video, Instagram, Facebook, Twitter, Globe, Linkedin, Youtube, Award, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { TicketTiersManager } from './TicketTiersManager';

interface FAQ {
  question: string;
  answer: string;
}

interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

interface Sponsor {
  name: string;
  logoUrl: string;
  websiteUrl?: string;
}

interface EventCustomizationProps {
  eventId: string;
  userId: string;
  isFreeEvent?: boolean;
  initialData?: {
    galleryImages?: string[];
    videos?: string[];
    faq?: FAQ[];
    schedule?: ScheduleItem[];
    additionalInfo?: string;
    socialLinks?: SocialLinks;
    sponsors?: Sponsor[];
    upiId?: string;
    paymentQrImageUrl?: string;
    discountPercent?: number;
    event_date?: string; // Added for date editing
  };
}

export const EventCustomization = ({ eventId, userId, isFreeEvent = true, initialData }: EventCustomizationProps) => {
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData?.galleryImages || []);
  const [videos, setVideos] = useState<string[]>(initialData?.videos || []);
  const [faq, setFaq] = useState<FAQ[]>(initialData?.faq || []);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialData?.schedule || []);
  const [additionalInfo, setAdditionalInfo] = useState(initialData?.additionalInfo || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialData?.socialLinks || {});
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialData?.sponsors || []);
  const [upiId, setUpiId] = useState(initialData?.upiId || '');
  const [paymentQrImageUrl, setPaymentQrImageUrl] = useState(initialData?.paymentQrImageUrl || '');
  const [discountPercent, setDiscountPercent] = useState(initialData?.discountPercent || 0); // Global event discount
  const [eventDate, setEventDate] = useState(initialData?.event_date || ''); // Event date editing
  const [uploading, setUploading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxGalleryImages = 20; // Increased from 10 to 20
    if (galleryImages.length + files.length > maxGalleryImages) {
      toast.error(`Maximum ${maxGalleryImages} gallery images allowed`);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 5MB`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has invalid type. Only JPEG, PNG, GIF, and WebP images are allowed`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/gallery/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setGalleryImages([...galleryImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded!`);
    } catch (error: any) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  // Local video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video count
    if (videos.length >= 5) {
      toast.error('Maximum 5 videos allowed');
      return;
    }

    // Validate file size (50MB max for videos)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Video file too large. Maximum size is 50MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']; // MP4, WebM, MOV
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid video format. Only MP4, WebM, and MOV are supported');
      return;
    }

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/videos/${eventId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-videos')
        .getPublicUrl(fileName);

      // Store video URL with metadata for cleanup
      setVideos([...videos, publicUrl]);
      toast.success('Video uploaded successfully!');

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  // Video handling
  const extractVideoEmbed = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const addVideo = () => {
    if (!newVideoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    if (videos.length >= 5) {
      toast.error('Maximum 5 videos allowed');
      return;
    }

    const embedUrl = extractVideoEmbed(newVideoUrl);
    if (!embedUrl) {
      toast.error('Please enter a valid YouTube or Vimeo URL');
      return;
    }

    if (videos.includes(embedUrl)) {
      toast.error('This video is already added');
      return;
    }

    setVideos([...videos, embedUrl]);
    setNewVideoUrl('');
    toast.success('Video added!');
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  // FAQ handling
  const addFAQ = () => {
    setFaq([...faq, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faq];
    updated[index][field] = value;
    setFaq(updated);
  };

  const removeFAQ = (index: number) => {
    setFaq(faq.filter((_, i) => i !== index));
  };

  // Schedule handling
  const addScheduleItem = () => {
    setSchedule([...schedule, { time: '', title: '', description: '' }]);
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  // Social links handling
  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks({ ...socialLinks, [platform]: value });
  };

  // Sponsor handling
  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

    if (file.size > maxSize) {
      toast.error('Logo is too large. Maximum size is 2MB');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/sponsors/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      const updated = [...sponsors];
      updated[index].logoUrl = publicUrl;
      setSponsors(updated);
      toast.success('Sponsor logo uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const addSponsor = () => {
    if (sponsors.length >= 20) {
      toast.error('Maximum 20 sponsors allowed');
      return;
    }
    setSponsors([...sponsors, { name: '', logoUrl: '', websiteUrl: '' }]);
  };

  const updateSponsor = (index: number, field: keyof Sponsor, value: string) => {
    const updated = [...sponsors];
    updated[index][field] = value;
    setSponsors(updated);
  };

  const removeSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  const handlePaymentQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      toast.error('File is too large. Maximum size is 2MB');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/payment-qr/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      setPaymentQrImageUrl(publicUrl);
      toast.success('Payment QR Code uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload QR Code');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          gallery_images: galleryImages,
          videos: videos,
          faq: faq.filter(f => f.question && f.answer) as any,
          schedule: schedule.filter(s => s.time && s.title) as any,
          additional_info: additionalInfo,
          social_links: socialLinks as any,
          sponsors: sponsors.filter(s => s.name && s.logoUrl) as any,
          upi_id: upiId || null,
          qr_code_url: paymentQrImageUrl || null,
          discount_percent: discountPercent,
          event_date: eventDate || null // Save event date
        })
        .eq('id', eventId);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      toast.success('Event customization saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ticket Tiers */}
      <TicketTiersManager eventId={eventId} isFreeEvent={isFreeEvent} />

      {/* Event Date & Time Editor */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            📅 Event Date & Time
          </CardTitle>
          <CardDescription>
            Change your event date and time here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date & Time</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate ? eventDate.slice(0, 16) : ''}
              onChange={(e) => setEventDate(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              💡 This will update the event date shown to customers
            </p>
          </div>
        </CardContent>
      </Card>

      {!isFreeEvent && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID (VPA)</Label>
              <Input
                id="upiId"
                placeholder="e.g. merchant@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a UPI ID where customers can send payments directly.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent">🎁 Event Discount (%)</Label>
              <div className="relative">
                <Input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  value={discountPercent}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setDiscountPercent(Math.min(100, Math.max(0, value)));
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                💰 Apply a blanket discount to ALL ticket tiers (0-100%).
                Customers will see the discounted price when purchasing.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custom Payment QR Code</Label>
              {paymentQrImageUrl ? (
                <div className="flex flex-col items-start gap-4">
                  <img
                    src={paymentQrImageUrl}
                    alt="Payment QR"
                    className="w-48 h-48 object-contain border rounded-lg bg-white p-2"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('qr-upload')?.click()}>
                      Change Image
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPaymentQrImageUrl('')} className="text-destructive">
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a screenshot of your payment QR code (GPay, PhonePe, Paytm etc)
                  </p>
                  <Button variant="outline" onClick={() => document.getElementById('qr-upload')?.click()}>
                    Upload QR Image
                  </Button>
                </div>
              )}
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePaymentQrUpload}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Event Gallery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gallery">Upload Images (max 20)</Label>
            <Input
              id="gallery"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploading}
              className="mt-1"
            />
          </div>

          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Event Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube or Vimeo URL"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addVideo} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add up to 5 videos from YouTube or Vimeo to showcase your event
          </p>

          {/* Local Video Upload */}
          <div className="border-t pt-4">
            <Label htmlFor="local-video" className="text-sm font-medium">Or Upload Local Video</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="local-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoUpload}
                disabled={uploadingVideo || videos.length >= 5}
                className="flex-1"
              />
              {uploadingVideo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Uploading...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, WebM, or MOV format. Max 50MB. Videos auto-delete after event date.
            </p>
          </div>

          {videos.length > 0 && (
            <div className="grid gap-4">
              {videos.map((url, index) => {
                // Check if it's an embed URL (YouTube/Vimeo) or direct video URL
                const isEmbedUrl = url.includes('youtube.com/embed') || url.includes('player.vimeo.com');

                return (
                  <div key={index} className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                      {isEmbedUrl ? (
                        <iframe
                          src={url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`Event video ${index + 1}`}
                        />
                      ) : (
                        <video
                          src={url}
                          controls
                          className="w-full h-full object-contain bg-black"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeVideo(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Social Media & Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-pink-500" />
              <Input
                placeholder="Instagram URL (e.g., https://instagram.com/yourevent)"
                value={socialLinks.instagram || ''}
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Facebook className="w-5 h-5 text-blue-600" />
              <Input
                placeholder="Facebook URL (e.g., https://facebook.com/yourevent)"
                value={socialLinks.facebook || ''}
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Twitter className="w-5 h-5 text-sky-500" />
              <Input
                placeholder="Twitter/X URL (e.g., https://twitter.com/yourevent)"
                value={socialLinks.twitter || ''}
                onChange={(e) => updateSocialLink('twitter', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Linkedin className="w-5 h-5 text-blue-700" />
              <Input
                placeholder="LinkedIn URL"
                value={socialLinks.linkedin || ''}
                onChange={(e) => updateSocialLink('linkedin', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Youtube className="w-5 h-5 text-red-600" />
              <Input
                placeholder="YouTube Channel URL"
                value={socialLinks.youtube || ''}
                onChange={(e) => updateSocialLink('youtube', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Website URL"
                value={socialLinks.website || ''}
                onChange={(e) => updateSocialLink('website', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>FAQ</CardTitle>
            <div className="flex gap-2">
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
                onChange={(e) => {
                  if (e.target.value) {
                    const [question, answer] = e.target.value.split('|||');
                    setFaq([...faq, { question, answer }]);
                    e.target.value = '';
                    toast.success('FAQ template added!');
                  }
                }}
              >
                <option value="">Add from templates...</option>
                <option value="What time does the event start?|||The event starts at 9:00 PM. Entry gates open at 8:30 PM. Please arrive early to avoid queues.">⏰ Event Timing</option>
                <option value="What is the dress code?|||Smart casuals are recommended. Entry may be refused for guests in shorts, sleepwear, or inappropriate attire.">👔 Dress Code</option>
                <option value="Is the ticket refundable?|||Tickets are non-refundable. However, they can be transferred to another person with prior notification.">💰 Refund Policy</option>
                <option value="Can I bring my own food/drinks?|||Outside food and beverages are not permitted. A wide variety of food and drinks will be available at the venue.">🍕 Food & Drinks</option>
                <option value="Is there parking available?|||Yes, ample parking is available at the venue. Valet parking is also available at an additional cost.">🚗 Parking</option>
                <option value="What is the minimum age requirement?|||The event is open to all ages. However, alcohol will only be served to guests 21 and above with valid ID.">🔞 Age Limit</option>
                <option value="Are stags allowed?|||Yes, stags are welcome. However, couple entry zones have limited stag capacity. Book early!">👥 Stag Entry</option>
                <option value="Can I upgrade my ticket?|||Yes, you can upgrade to a higher tier by paying the difference. Contact us 24 hours before the event.">⬆️ Ticket Upgrade</option>
                <option value="What items are not allowed?|||Prohibited items include: weapons, illegal substances, outside alcohol, professional cameras, and laser pointers.">🚫 Prohibited Items</option>
                <option value="How do I get my ticket?|||Your ticket will be sent to your email immediately after payment. You can also download it from your account.">🎫 Ticket Delivery</option>
              </select>
              <Button variant="outline" size="sm" onClick={addFAQ}>
                <Plus className="w-4 h-4 mr-2" />
                Custom FAQ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faq.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  />
                  <Textarea
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFAQ(index)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {faq.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No FAQ added yet. Click "Add FAQ" to add questions and answers.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event Schedule</CardTitle>
            <Button variant="outline" size="sm" onClick={addScheduleItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    type="time"
                    placeholder="Time"
                    value={item.time}
                    onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                  />
                  <Input
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => updateScheduleItem(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateScheduleItem(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScheduleItem(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {schedule.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No schedule items added yet. Click "Add Schedule Item" to create your event timeline.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional information about the event (dress code, parking info, special instructions, etc.)"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Event Sponsors
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addSponsor}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Sponsor Name</Label>
                    <Input
                      placeholder="e.g., Acme Corp"
                      value={sponsor.name}
                      onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Logo</Label>
                    {sponsor.logoUrl ? (
                      <div className="flex items-center gap-3 mt-1">
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name || 'Sponsor logo'}
                          className="h-16 w-auto max-w-[200px] object-contain border rounded p-1 bg-background"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSponsor(index, 'logoUrl', '')}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSponsorLogoUpload(e, index)}
                        disabled={uploading}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div>
                    <Label>Website URL (optional)</Label>
                    <Input
                      placeholder="https://sponsor-website.com"
                      value={sponsor.websiteUrl || ''}
                      onChange={(e) => updateSponsor(index, 'websiteUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSponsor(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {sponsors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sponsors added yet. Click "Add Sponsor" to showcase your event partners.
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" variant="cyber">
        Save Customization
      </Button>
    </div>
  );
};
