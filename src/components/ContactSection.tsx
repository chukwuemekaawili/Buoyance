import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactSection() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!formData.message.trim()) {
      toast.error("Please enter your message");
      return false;
    }
    if (formData.message.trim().length < 10) {
      toast.error("Message must be at least 10 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim() || "No subject",
        message: formData.message.trim(),
      });

      if (error) {
        console.error("Contact form error:", error);
        throw error;
      }

      // Success!
      setIsSubmitted(true);
      setFormData(initialFormData);
      toast.success("Message sent successfully! We'll respond within 24 hours.", {
        duration: 5000,
      });

      // Reset success state after 5 seconds to allow another submission
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error: any) {
      console.error("Contact form submission failed:", error);
      toast.error(
        error.message ||
          "Failed to send message. Please try again or email support@buoyance.ng",
        { duration: 7000 }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Contact Us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions about tax compliance? Our team is here to help you
            navigate Nigerian tax regulations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Form */}
          <div className="bg-card rounded-xl p-8 shadow-md border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Send us a message
            </h3>
            
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h4 className="text-xl font-semibold text-foreground mb-2">
                  Message Sent!
                </h4>
                <p className="text-muted-foreground">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      maxLength={255}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Subject
                  </label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Message <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.message.length}/2000 characters
                  </p>
                </div>
                <Button
                  type="submit"
                  variant="accent"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Get in touch
              </h3>
              <p className="text-muted-foreground mb-8">
                Whether you need help with tax calculations, compliance questions,
                or want to learn more about our platform, we're here to assist.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Email</h4>
                  <p className="text-muted-foreground">support@buoyance.ng</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Phone</h4>
                  <p className="text-muted-foreground">+234 (0) 800 BUOYANCE</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Office</h4>
                  <p className="text-muted-foreground">Lagos, Nigeria</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
