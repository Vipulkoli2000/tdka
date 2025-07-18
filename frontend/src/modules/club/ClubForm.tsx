import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Services and utilities
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
  role: z.string().default("clubadmin"),
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

  // Initialize form with Shadcn Form
  const form = useForm<ClubFormInputs>({
    resolver: zodResolver(mode === "create" ? clubFormSchemaCreate : clubFormSchemaEdit),
    defaultValues: {
      clubName: "",
      city: "",
      address: "",
      mobile: "",
      email: "",
      password: "",
      role: "clubadmin", // Set default role for club users
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
      form.setValue("clubName", clubData.clubName || "");
      form.setValue("city", clubData.city || "");
      form.setValue("address", clubData.address || "");
      form.setValue("mobile", clubData.mobile || "");
      form.setValue("email", clubData.email || "");
      // Note: We don't set password for security reasons in edit mode
    }
  }, [clubData, mode, form]);

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
      Validate(error, form.setError);
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
      Validate(error, form.setError);
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
  const onSubmit = (data: ClubFormInputs) => {
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          {/* Club Name Field */}
          <FormField
            control={form.control}
            name="clubName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Club Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter club name"
                    {...field}
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City Field */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city"
                    {...field}
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address Field */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter address"
                    {...field}
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mobile and Email Fields in a grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Mobile Field */}
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter mobile number"
                      {...field}
                      disabled={isFormLoading}
                      maxLength={10}
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address"
                      {...field}
                      disabled={isFormLoading}
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Password
                  {mode === "create" && <span className="text-red-500">*</span>}
                  {mode === "edit" && <span className="text-sm text-muted-foreground ml-2">(Leave blank to keep current password)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={mode === "create" ? "Enter password" : "Leave blank to keep current password"}
                    {...field}
                    disabled={isFormLoading}
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
      </Form>
    </div>
  );
};

export default ClubForm;