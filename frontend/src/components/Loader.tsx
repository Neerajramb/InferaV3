import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-10 h-10 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>

        <motion.p
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="text-sm tracking-wide"
        >
          Entering Infera...
        </motion.p>
      </motion.div>
    </div>
  );
}