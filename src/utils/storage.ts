import { supabase } from './supabase';

export const uploadProfileImage = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    return null;
  }
};

export const deleteProfileImage = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('profile-pictures')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProfileImage:', error);
    return false;
  }
};
