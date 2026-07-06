"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/MemberAuthContext";
import {
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const ProfilePage = () => {
  const router = useRouter();
  const { user: member, checkSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    emergencyContact: "",
    profileImage: "",
    height: "",
    weight: "",
    age: "",
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        dob: member.dob || "",
        gender: member.gender || "",
        address: member.address || "",
        emergencyContact: member.emergencyContact || "",
        profileImage: member.profileImage || "",
        height: member.height?.toString() || "",
        weight: member.weight?.toString() || "",
        age: member.age?.toString() || "",
      });
    }
  }, [member]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.message || "Failed to upload image");
      }

      setFormData(prev => ({
        ...prev,
        profileImage: uploadData.url
      }));

      // Auto-save profile image
      if (member?.id) {
        await updateProfile({ profileImage: uploadData.url });
      }
    } catch (error) {
      setErrorMessage("Failed to upload image. Please try again.");
      console.error("Image upload error:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  const updateProfile = async (dataToUpdate?: any) => {
    const updateData = dataToUpdate || formData;
    
    try {
      setLoading(true);
      setErrorMessage("");
      
      const res = await fetch(`/api/members/${member?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSaveSuccess(true);
      setIsEditing(false);
      await checkSession(); // Refresh member data
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setErrorMessage("Failed to update profile. Please try again.");
      console.error("Profile update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile();
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setErrorMessage("");
    // Reset form to original values
    if (member) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        dob: member.dob || "",
        gender: member.gender || "",
        address: member.address || "",
        emergencyContact: member.emergencyContact || "",
        profileImage: member.profileImage || "",
        height: member.height?.toString() || "",
        weight: member.weight?.toString() || "",
        age: member.age?.toString() || "",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-lime-400 text-black font-semibold rounded-2xl hover:bg-lime-300 transition-colors"
          >
            Edit 
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={cancelEdit}
              className="px-6 py-3 bg-white/10 text-white font-medium rounded-2xl hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-lime-400 text-black font-semibold rounded-2xl hover:bg-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3">
          <CheckCircle className="text-green-400" size={20} />
          <span className="text-green-400">Profile updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-400">{errorMessage}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white/[0.03] backdrop-blur rounded-3xl p-6 lg:p-8 border border-white/10">
        {/* Profile Image Section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-lime-400/20 to-green-500/20 border-2 border-lime-400/30">
              {formData.profileImage ? (
                <img
                  src={formData.profileImage}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-lime-400/50" />
                </div>
              )}
            </div>
            
            {/* Upload Button */}
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-lime-400 text-black rounded-xl hover:bg-lime-300 transition-colors disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Camera size={20} />
                )}
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">{formData.name || "Member"}</h2>
            <p className="text-gray-400 mt-1">{formData.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-lime-400/10 text-lime-400 text-sm rounded-full">
                Active Member
              </span>
              <span className="px-3 py-1 bg-white/10 text-gray-300 text-sm rounded-full">
                Member ID: {member?.id?.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <User size={16} className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <Mail size={16} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                placeholder="Enter your email"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <Phone size={16} className="inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                disabled
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 placeholder-gray-500 cursor-not-allowed opacity-50"
                placeholder="Phone number"
              />
              <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed contact admin</p>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <Calendar size={16} className="inline mr-2" />
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                disabled={!isEditing}
                className="w-full  px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <Users size={16} className="inline mr-2" />
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="" className="bg-neutral-900">Select Gender</option>
                <option value="Male" className="bg-neutral-900">Male</option>
                <option value="Female" className="bg-neutral-900">Female</option>
                <option value="Other" className="bg-neutral-900">Other</option>
              </select>
            </div>

            {/* Height */}
<div>
  <label className="text-sm text-gray-400 mb-2 block">
    Height (cm)
  </label>
  <input
    type="number"
    value={formData.height}
    onChange={(e) =>
      setFormData({ ...formData, height: e.target.value })
    }
    disabled={!isEditing}
    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    placeholder="Enter height in cm"
  />
</div>

{/* Weight */}
<div>
  <label className="text-sm text-gray-400 mb-2 block">
    Weight (kg)
  </label>
  <input
    type="number"
    value={formData.weight}
    onChange={(e) =>
      setFormData({ ...formData, weight: e.target.value })
    }
    disabled={!isEditing}
    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    placeholder="Enter weight in kg"
  />
</div>

{/* Age */}
<div>
  <label className="text-sm text-gray-400 mb-2 block">
    Age
  </label>
  <input
    type="number"
    value={formData.age}
    onChange={(e) =>
      setFormData({ ...formData, age: e.target.value })
    }
    disabled={!isEditing}
    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    placeholder="Enter age"
  />
</div>

            {/* Emergency Contact */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                <Phone size={16} className="inline mr-2" />
                Emergency Contact
              </label>
              <input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                placeholder="Emergency contact number"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400 mb-2 block">
                <MapPin size={16} className="inline mr-2" />
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors resize-none"
                placeholder="Enter your full address"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Additional Information Card */}
      <div className="bg-white/[0.03] backdrop-blur rounded-3xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Member Since</p>
            <p className="text-white mt-1">
              {member?.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Last Updated</p>
            <p className="text-white mt-1">
              {member?.updatedAt ? new Date(member.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;