import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface ClubData {
  id: number;
  clubName: string;
  city: string;
  address: string;
  mobile: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// Create separate schemas for create and edit modes
const clubFormSchemaBase = z.object({
  clubName: z.string()
    .min(1, "Club name is required")
    .max(255, "Club name must not exceed 255 characters"),
  city: z.string()
    .min(1, "City is required")
    .max(255, "City must not exceed 255 characters"),
  address: z.string()
    .min(1, "Address is required")
    .max(255, "Address must not exceed 255 characters"),
  mobile: z.string()
    .min(1, "Mobile number is required")
    .max(255, "Mobile number must not exceed 255 characters"),
  email: z.string()
    .email("Valid email is required")
    .max(255, "Email must not exceed 255 characters"),
});

const clubFormSchemaCreate = clubFormSchemaBase.extend({
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password must not exceed 255 characters"),
});

const clubFormSchemaEdit = clubFormSchemaBase.extend({
  password: z.string()
    .max(255, "Password must not exceed 255 characters")
    .optional()
    .or(z.literal('')),
});

// Helper to extract user-friendly message from API error
const prettifyFieldName = (key: string): string => {
  // Remove table prefix and suffix if present
  const parts = key.split("_");
  let field = parts.length > 1 ? parts[1] : key;
  // Remove trailing 'key' or 'id'
  field = field.replace(/(key|id)$/i, "");
  // Convert camelCase to spaced words
  field = field.replace(/([A-Z])/g, " $1").trim();
  // Capitalize first letter
  return field.charAt(0).toUpperCase() + field.slice(1);
};

const extractErrorMessage = (error: any): string | undefined => {
  if (error?.errors && typeof error.errors === "object") {
    const firstKey = Object.keys(error.errors)[0];
    if (firstKey) {
      const message = error.errors[firstKey]?.message as string | undefined;
      if (message) {
        const pretty = prettifyFieldName(firstKey);
        return message.replace(firstKey, pretty);
      }
    }
  }
  return error?.message;
};

type ClubFormInputs = z.infer<typeof clubFormSchemaCreate>;

interface ClubFormProps {
  mode: "create" | "edit";
  clubId?: string;
  onSuccess?: () => void;
  className?: string;
}

const ClubForm = ({
  mode,
  clubId,
  onSuccess,
  className,
}: ClubFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Combined loading club from fetch and mutations

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ClubFormInputs>({
    resolver: zodResolver(mode === "create" ? clubFormSchemaCreate : clubFormSchemaEdit),
    defaultValues: {
      clubName: "",
      city: "",
      address: "",
      mobile: "",
      email: "",
      password: "",
    },
  });

  // Query for fetching club data in edit mode
  const { data: clubData, isLoading: isFetchingClub, error: fetchError } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async (): Promise<ClubData> => {
      if (!clubId) throw new Error("Club ID is required");
      const response = await get(`/clubs/${clubId}`);
      console.log("Club API response:", response); // Debug log
      // Handle different response structures
      return response.club || response;
    },
    enabled: mode === "edit" && !!clubId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful club fetch
  useEffect(() => {
    console.log("Club data received:", clubData); // Debug log
    if (clubData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      setValue("clubName", clubData.clubName || "");
      setValue("city", clubData.city || "");
      setValue("address", clubData.address || "");
      setValue("mobile", clubData.mobile || "");
      setValue("email", clubData.email || "");
      // Note: We don't set password for security reasons in edit mode
    }
  }, [clubData, mode, setValue]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch club details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a club
  const createClubMutation = useMutation({
    mutationFn: (data: ClubFormInputs) => {
      return post("/clubs", data);
    },
    onSuccess: () => {
      toast.success("Club created successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    },
    onError: (error: any) => {
      Validate(error, setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create club");
      }
    },
  });

  // Mutation for updating a club
  const updateClubMutation = useMutation({
    mutationFn: (data: ClubFormInputs) => {
      return put(`/clubs/${clubId}`, data);
    },
    onSuccess: () => {
      toast.success("Club updated successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    },
    onError: (error: any) => {
      Validate(error, setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update club");
      }
    },
  });

  // Handle form submission
  const onSubmit: SubmitHandler<ClubFormInputs> = (data) => {
    if (mode === "create") {
      createClubMutation.mutate(data);
    } else {
      updateClubMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/clubs");
    }
  };

  // Combined loading club from fetch and mutations
  const isFormLoading = isFetchingClub || createClubMutation.isPending || updateClubMutation.isPending;

  return (
    <div className={className}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {/* Club Name Field */}
        <div className="grid gap-2 relative">
          <Label htmlFor="clubName" className="block mb-2">Club Name <span className="text-red-500">*</span></Label>
          <Input
            id="clubName"
            placeholder="Enter club name"
            {...register("clubName")}
            disabled={isFormLoading}
          />
          {errors.clubName && (
            <span className="mt-1 block text-xs text-destructive">
              {errors.clubName.message}
            </span>
          )}

          {/* Account Number Field */}
          <div className="grid gap-2 relative">
            <Label htmlFor="city" className="block mb-2">City <span className="text-red-500">*</span></Label>
            <Input
              id="city"
              placeholder="Enter city"
              {...register("city")}
              disabled={isFormLoading}
            />
            {errors.city && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.city.message}
              </span>
            )}
          </div>


          <Label htmlFor="address" className="block mb-2">Address <span className="text-red-500">*</span></Label>
          <Input
            id="address"
            placeholder="Enter address"
            {...register("address")}
            disabled={isFormLoading}
          />
          {errors.address && (
            <span className="mt-1 block text-xs text-destructive">
              {errors.address.message}
            </span>
          )}


          <div className="grid grid-cols-2 gap-4">
            <div>
              {/* Mobile Field */}
              <Label htmlFor="mobile" className="block mb-2">Mobile<span className="text-red-500">*</span></Label>
              <Input
                id="mobile"
                placeholder="Enter mobile number"
                {...register("mobile")}
                disabled={isFormLoading}
                maxLength={10}
                type="tel"
              />
              {errors.mobile && (
                <span className="mt-1 block text-xs text-destructive">
                  {errors.mobile.message}
                </span>
              )}
            </div>

            <div>
              {/* Email Field */}
              <Label htmlFor="email" className="block mb-2">Email<span className="text-red-500">*</span></Label>
              <Input
                id="email"
                placeholder="Enter email address"
                {...register("email")}
                disabled={isFormLoading}
                type="email"
              />
              {errors.email && (
                <span className="mt-1 block text-xs text-destructive">
                  {errors.email.message}
                </span>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="grid gap-2 relative">
            <Label htmlFor="password" className="block mb-2">
              Password
              {mode === "create" && <span className="text-red-500">*</span>}
              {mode === "edit" && <span className="text-sm text-muted-foreground ml-2">(Leave blank to keep current password)</span>}
            </Label>
            <Input
              id="password"
              placeholder={mode === "create" ? "Enter password" : "Leave blank to keep current password"}
              {...register("password")}
              disabled={isFormLoading}
              type="password"
            />
            {errors.password && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.password.message}
              </span>
            )}
          </div>



        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isFormLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isFormLoading}>
            {isFormLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create" : "Update"} Club
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClubForm;
