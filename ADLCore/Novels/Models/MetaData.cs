﻿using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;
using ADLCore.Ext;

namespace ADLCore.Novels.Models
{
    //Provides general information about books and manga.
    public class MetaData
    {
        public string name { get; set; } //author, rating, genre, type;
        public string author { get; set; }
        public string rating { get; set; }
        public string genre { get; set; }
        public string type { get; set; }
        public int Language { get; set; }

        public enum LangTypes
        {
                Original,
                Translated,
                Machine,
                Mixed,
                Unknown
        }

        public enum StatusTypes
        {
            Active,
            Hiatus,
            Complete,
            Dropped
        }
        
        public StatusTypes Status { get; set; }
        public LangTypes LangType { get; set; }
        public string url { get; set; }
        public string description { get; set; }
        public string coverPath { get; set; }
        public string givenCommand { get; set; }
        public Byte[] cover { get; set; }

        /// <summary>
        /// Callback for API/integrations.
        /// I didn't see a reason as to return covers as part of the grabHome or other functions, as it would take up unneeded bandwidth, if they are not used.
        /// </summary>
        [JsonIgnore]
        public Func<MetaData, byte[]> getCover;
        
        [JsonIgnore]
        private DownloaderBase downloader;

        public void ParseStatus(string status)
        {
            switch (status)
            {
                case "Complete":
                {
                    this.Status = StatusTypes.Complete;
                    break;
                }
                case "Completed":
                {
                    this.Status = StatusTypes.Complete;
                    break;
                }                
                case "Done":
                {
                    this.Status = StatusTypes.Complete;
                    break;
                }                
                case "Hiatus":
                {
                    this.Status = StatusTypes.Hiatus;
                    break;
                }                
                case "Dropped":
                {
                    this.Status = StatusTypes.Dropped;
                    break;
                }
                case "Active":
                {
                    this.Status = StatusTypes.Active;
                    break;
                }
            }
        }
        
        public override string ToString()
        {
            StringBuilder sb = new StringBuilder();
            FieldInfo[] fields = typeof(MetaData).GetFields(BindingFlags.Instance | BindingFlags.NonPublic);
            foreach (FieldInfo field in fields)
            {
                if (field.Name == "cover")
                    continue;
                string x = field.GetValue(this)?.ToString();
                sb.Append((String.IsNullOrEmpty(x)
                    ? string.Empty
                    : x.Replace("\n", string.Empty).Replace("\r", string.Empty)) + Environment.NewLine);
            }

            return sb.ToString();
        }

        public static MetaData GetMeta(string[] data)
        {
            MetaData md = new MetaData();
            FieldInfo[] fields = typeof(MetaData).GetFields(BindingFlags.Instance | BindingFlags.NonPublic);
            for (int idx = 0; idx < fields.Length - 1; idx++)
            {
                if (fields[idx].Name == "<cover>k__BackingField")
                {
                    continue;
                }

                fields[idx].SetValue(md, ((string) data[idx]).Trim('\r', '\n'));
            }

            return md;
        }

        public static void GetChapterLinks()
        {
            
        }
    }
}