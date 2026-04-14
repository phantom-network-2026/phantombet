
DROP POLICY "Staff can view all tasks" ON public.staff_tasks;

CREATE POLICY "Staff can view assigned tasks"
ON public.staff_tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR (assigned_to = auth.uid() AND has_role(auth.uid(), 'staff'::app_role))
);
