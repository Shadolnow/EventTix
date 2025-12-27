-- Step 1: Check if user exists in auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'dfasonfe@gmail.com';

-- Step 2: Test the get_user_by_email function
SELECT * FROM public.get_user_by_email('dfasonfe@gmail.com');

-- Step 3: Check if they already have a role
SELECT * FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'dfasonfe@gmail.com'
);

-- Step 4: Check profiles table
SELECT * FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'dfasonfe@gmail.com'
);
