-- Create Contacts Table for Supabase
-- No authentication or row-level security (RLS) required

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  town TEXT,
  phone TEXT,
  email TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on email for faster lookups
CREATE INDEX idx_contacts_email ON contacts(email);

-- Create an index on created_at for sorting/filtering
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- Insert Sample Data
INSERT INTO contacts (name, phone, email, town, comments) VALUES
  ('John Smith', '555-0101', 'john.smith@example.com', NULL, 'Regular customer'),
  ('Sarah Johnson', '555-0102', 'sarah.j@example.com', NULL, 'VIP client'),
  ('Michael Chen', '555-0103', 'michael.chen@example.com', NULL, 'Referred by John'),
  ('Emily Davis', '555-0104', 'emily.davis@example.com', NULL, 'Needs follow-up'),
  ('Robert Wilson', '555-0105', 'robert.w@example.com', NULL, 'Pending approval'),
  ('Lisa Anderson', '555-0106', 'lisa.anderson@example.com', NULL, 'Active account'),
  ('David Martinez', '555-0107', 'david.m@example.com', NULL, NULL),
  ('Jennifer Taylor', '555-0108', 'jennifer.t@example.com', NULL, 'Request quote'),
  ('Maria Popova', '+359 888 111 222', 'maria.p@abv.bg', 'Sofia', NULL),
  ('Stephan', '+359 888 222 333', 'stef99@gmail.com', 'Sofia', 'Stephan from the ski school'),
  ('Lukas Schneider', '+49 151 23456789', 'lukasss@web.de', 'Munich', 'Friend of my dad'),
  ('George Ivanov', '+359 2 981 9811', 'ggiv@dir.bg', 'Varna', NULL),
  ('Ivan Petrov', '+359 888 333 444', 'ivan.petrov@abv.bg', 'Plovdiv', NULL),
  ('Elena Georgieva', '+359 887 101 202', 'elena.g@abv.bg', 'Sofia', 'University colleague'),
  ('Krasimir Angelov', '+359 889 676 767', 'krasimir.a@dir.bg', 'Plovdiv', NULL),
  ('Carlos Fernández', '+34 612 345 678', 'c.fernandez@gmail.com', 'Madrid', NULL),
  ('Nikolay Dimitrov', '+359 889 555 666', 'nikolay.d@gmail.com', 'Burgas', NULL),
  ('Desislava Ivanova', '+359 888 777 888', 'desi.ivanova@dir.bg', 'Ruse', 'Accounting department'),
  ('Daniela Stoyanova', '+359 886 898 989', 'dani.stoyanova@yahoo.com', 'Plovdiv', 'HR department'),
  ('Dimitar Angelov', '+359 889 111 999', 'd.angelov@proton.me', 'Veliko Tarnovo', NULL),
  ('Petar Nikolov', '+359 888 454 545', 'petar.nikolov@abv.bg', 'Varna', NULL),
  ('Silvia Kirova', '+359 887 232 323', 'silvia.kirova@gmail.com', 'Varna', 'Works in tourism'),
  ('Atanas Georgiev', '+359 888 303 404', 'atanas.g@gmail.com', 'Varna', 'Friend from university'),
  ('Kalina Petrova', '+359 888 010 203', 'kalina.p@gmail.com', 'Blagoevgrad', 'Marketing team'),
  ('Todor Marinov', '+359 887 777 121', 't.marinov@abv.bg', 'Sofia', 'Gym buddy'),
  ('Erik Svensson', '+46 70 123 45 67', 'erik.svensson@gmail.com', 'Stockholm', 'Manager for Sweden'),
  ('Milena Todorova', '+359 887 121 212', 'milena.t@abv.bg', 'Gabrovo', NULL),
  ('Boyan Iliev', '+359 889 808 707', 'boyan.iliev@gmail.com', 'Plovdiv', 'Startup founder'),
  ('Radostina Peeva', '+359 885 333 222', 'r.peeva@yahoo.com', 'Sofia', NULL),
  ('Agnieszka Nowak', '+48 698 765 432', 'a.nowak@yahoo.pl', 'Kraków', 'Ski instructor'),
  ('Stoyan Vasilev', '+359 888 222 101', 'stoyan.v@gmail.com', 'Bansko', 'Ski instructor'),
  ('Veselina Hristova', '+359 886 555 444', 'veselina.hr@abv.bg', 'Varna', 'HR contact'),
  ('Sophie Dubois', '+33 6 12 34 56 78', 'sophdub@yahoo.fr', 'Lyon', 'Met in Paris'),
  ('Georgi Stoyanov', '+359 886 123 456', 'g.stoyanov@yahoo.com', 'Sofia', NULL),
  ('Hristo Kolev', '+359 885 909 090', 'hristo.kolev@gmail.com', 'Stara Zagora', 'Old classmate'),
  ('Yana Nikolova', '+359 887 444 555', 'yana.n@abv.bg', 'Pleven', NULL);
